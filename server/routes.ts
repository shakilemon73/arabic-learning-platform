import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { Server as SocketServer } from "socket.io";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertUserSchema, insertHomeworkSubmissionSchema, insertLiveClassSessionSchema } from "@shared/schema";
import { z } from "zod";
import crypto from "crypto";
import multer from "multer";
import path from "path";
import fs from "fs";

// Bangladeshi Payment Gateway Configuration
const bkashConfig = {
  sandbox_base_url: "https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout",
  production_base_url: "https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout",
  username: process.env.BKASH_USERNAME || "sandboxTokenizedUser02",
  password: process.env.BKASH_PASSWORD || "sandboxTokenizedUser02@12345", 
  app_key: process.env.BKASH_APP_KEY || "4f6o0cjiki2rfm34kfdadl1eqq",
  app_secret: process.env.BKASH_APP_SECRET || "2is7hdktrekvrbljjh44ll3d9l1dtjo4pasmjvs5vl5qr3fug4b",
  is_sandbox: process.env.NODE_ENV !== 'production'
};

// Generate payment reference ID
const generatePaymentRef = () => {
  return 'PAY_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

// File upload configuration
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images, PDFs, and documents are allowed'));
    }
  },
});

// Session participants tracking
const sessionParticipants = new Map<string, Set<string>>();
const participantSockets = new Map<string, WebSocket>();

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Course registration endpoint
  app.post('/api/register', async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(validatedData);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input", errors: error.errors });
      } else {
        console.error("Registration error:", error);
        res.status(500).json({ message: "Registration failed" });
      }
    }
  });

  // bKash payment creation for course enrollment (600 BDT)
  app.post("/api/bkash/create-payment", async (req, res) => {
    try {
      const { userId, paymentMethod = 'bkash' } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID required" });
      }

      const paymentRef = generatePaymentRef();
      const baseUrl = bkashConfig.is_sandbox ? bkashConfig.sandbox_base_url : bkashConfig.production_base_url;
      
      // Get bKash token
      const tokenResponse = await fetch(`${baseUrl}/token/grant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'username': bkashConfig.username,
          'password': bkashConfig.password
        },
        body: JSON.stringify({
          app_key: bkashConfig.app_key,
          app_secret: bkashConfig.app_secret
        })
      });

      const tokenData = await tokenResponse.json();
      
      if (!tokenData.id_token) {
        return res.status(400).json({ message: "Failed to get payment token" });
      }

      // Create payment
      const createPaymentResponse = await fetch(`${baseUrl}/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authorization': tokenData.id_token,
          'x-app-key': bkashConfig.app_key
        },
        body: JSON.stringify({
          mode: '0011',
          payerReference: ' ',
          callbackURL: `${req.protocol}://${req.get('host')}/api/bkash/callback`,
          amount: '600.00',
          currency: 'BDT',
          intent: 'sale',
          merchantInvoiceNumber: paymentRef
        })
      });

      const paymentData = await createPaymentResponse.json();

      if (paymentData.paymentID) {
        // Store payment information
        await storage.createPaymentRecord(userId, {
          paymentId: paymentData.paymentID,
          paymentRef: paymentRef,
          amount: 600,
          method: paymentMethod,
          status: 'pending'
        });

        res.json({
          success: true,
          paymentID: paymentData.paymentID,
          bkashURL: paymentData.bkashURL,
          paymentRef: paymentRef
        });
      } else {
        res.status(400).json({ 
          message: "Payment creation failed",
          error: paymentData.errorMessage 
        });
      }
    } catch (error: any) {
      console.error("bKash payment creation error:", error);
      res.status(500).json({ message: "Error creating bKash payment: " + error.message });
    }
  });

  // bKash callback handler
  app.post('/api/bkash/callback', async (req, res) => {
    try {
      const { paymentID, status } = req.body;
      
      if (!paymentID) {
        return res.status(400).json({ message: "Payment ID required" });
      }

      if (status === 'success') {
        // Execute payment to complete the transaction
        const baseUrl = bkashConfig.is_sandbox ? bkashConfig.sandbox_base_url : bkashConfig.production_base_url;
        
        // Get fresh token
        const tokenResponse = await fetch(`${baseUrl}/token/grant`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'username': bkashConfig.username,
            'password': bkashConfig.password
          },
          body: JSON.stringify({
            app_key: bkashConfig.app_key,
            app_secret: bkashConfig.app_secret
          })
        });

        const tokenData = await tokenResponse.json();

        // Execute payment
        const executeResponse = await fetch(`${baseUrl}/execute`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'authorization': tokenData.id_token,
            'x-app-key': bkashConfig.app_key
          },
          body: JSON.stringify({
            paymentID: paymentID
          })
        });

        const executeData = await executeResponse.json();

        if (executeData.transactionStatus === 'Completed') {
          // Update payment status and user enrollment
          await storage.updatePaymentStatus(paymentID, 'completed', executeData.trxID);
          await storage.updateUserPaymentStatus(executeData.merchantInvoiceNumber, "paid");
          
          res.json({ 
            success: true, 
            message: "Payment successful! Course enrollment activated.",
            transactionId: executeData.trxID
          });
        } else {
          res.status(400).json({ 
            message: "Payment execution failed",
            error: executeData.errorMessage 
          });
        }
      } else {
        await storage.updatePaymentStatus(paymentID, 'failed');
        res.status(400).json({ message: "Payment was cancelled or failed" });
      }
    } catch (error: any) {
      console.error("bKash callback error:", error);
      res.status(500).json({ message: "Payment callback processing failed" });
    }
  });

  // Manual payment verification for Nagad/Rocket
  app.post('/api/manual-payment', async (req, res) => {
    try {
      const { userId, paymentMethod, transactionId, amount, phoneNumber } = req.body;
      
      if (!userId || !paymentMethod || !transactionId || !phoneNumber) {
        return res.status(400).json({ message: "All fields are required" });
      }

      if (amount !== 600) {
        return res.status(400).json({ message: "Course fee is 600 BDT" });
      }

      const paymentRef = generatePaymentRef();
      
      // Store payment for manual verification
      await storage.createPaymentRecord(userId, {
        paymentId: transactionId,
        paymentRef: paymentRef,
        amount: amount,
        method: paymentMethod,
        status: 'pending_verification',
        phoneNumber: phoneNumber
      });

      res.json({
        success: true,
        message: "Payment submitted for verification. We will confirm within 24 hours.",
        paymentRef: paymentRef
      });
    } catch (error: any) {
      console.error("Manual payment submission error:", error);
      res.status(500).json({ message: "Failed to submit payment for verification" });
    }
  });

  // Get course modules
  app.get('/api/course-modules', async (req, res) => {
    try {
      const modules = await storage.getCourseModules();
      res.json(modules);
    } catch (error) {
      console.error("Error fetching course modules:", error);
      res.status(500).json({ message: "Failed to fetch course modules" });
    }
  });

  // Get live classes
  app.get('/api/live-classes', async (req, res) => {
    try {
      const classes = await storage.getLiveClasses();
      res.json(classes);
    } catch (error) {
      console.error("Error fetching live classes:", error);
      res.status(500).json({ message: "Failed to fetch live classes" });
    }
  });

  // Get upcoming classes (protected)
  app.get('/api/upcoming-classes', isAuthenticated, async (req, res) => {
    try {
      const classes = await storage.getUpcomingClasses();
      res.json(classes);
    } catch (error) {
      console.error("Error fetching upcoming classes:", error);
      res.status(500).json({ message: "Failed to fetch upcoming classes" });
    }
  });

  // Get instructors
  app.get('/api/instructors', async (req, res) => {
    try {
      const instructors = await storage.getInstructors();
      res.json(instructors);
    } catch (error) {
      console.error("Error fetching instructors:", error);
      res.status(500).json({ message: "Failed to fetch instructors" });
    }
  });

  // Record class attendance (protected)
  app.post('/api/attendance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { classId, duration } = req.body;
      
      const attendance = await storage.recordAttendance(userId, classId, duration);
      res.json(attendance);
    } catch (error) {
      console.error("Error recording attendance:", error);
      res.status(500).json({ message: "Failed to record attendance" });
    }
  });

  // Get user's attendance history (protected)
  app.get('/api/my-attendance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const attendance = await storage.getUserAttendance(userId);
      res.json(attendance);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      res.status(500).json({ message: "Failed to fetch attendance" });
    }
  });

  // Update course progress (protected)
  app.patch('/api/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { progress } = req.body;
      
      if (typeof progress !== 'number' || progress < 0 || progress > 100) {
        return res.status(400).json({ message: "Progress must be a number between 0 and 100" });
      }
      
      const user = await storage.updateCourseProgress(userId, progress);
      res.json(user);
    } catch (error) {
      console.error("Error updating progress:", error);
      res.status(500).json({ message: "Failed to update progress" });
    }
  });

  // Live class session management
  app.post('/api/live-sessions/create', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { classId } = req.body;
      
      if (!classId) {
        return res.status(400).json({ message: "Class ID is required" });
      }
      
      const sessionToken = crypto.randomUUID();
      const session = await storage.createLiveSession({
        classId,
        instructorId: userId,
        sessionToken,
        isActive: true,
      });
      
      res.json(session);
    } catch (error) {
      console.error("Error creating live session:", error);
      res.status(500).json({ message: "Failed to create live session" });
    }
  });

  // Homework submission endpoints
  app.post('/api/upload-homework-file', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { sessionId, userId } = req.body;
      
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(process.cwd(), 'uploads', 'homework');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Generate unique filename
      const ext = path.extname(req.file.originalname);
      const filename = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`;
      const filepath = path.join(uploadsDir, filename);
      
      // Move file to permanent location
      fs.renameSync(req.file.path, filepath);
      
      const fileUrl = `/uploads/homework/${filename}`;
      
      res.json({
        success: true,
        fileUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
      });
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ message: "File upload failed" });
    }
  });

  app.post('/api/homework/submit', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { title, description, files, sessionId } = req.body;
      
      if (!title || !sessionId) {
        return res.status(400).json({ message: "Title and session ID are required" });
      }

      const submission = await storage.createHomeworkSubmission({
        userId,
        classId: sessionId, // In this case, sessionId represents the classId
        title,
        description,
        fileUrl: files.length > 0 ? files[0].fileUrl : null,
        fileName: files.length > 0 ? files[0].fileName : null,
        fileSize: files.length > 0 ? files[0].fileSize : null,
        status: 'submitted',
      });

      res.json({
        success: true,
        submission,
      });
    } catch (error) {
      console.error("Homework submission error:", error);
      res.status(500).json({ message: "Failed to submit homework" });
    }
  });

  // YouTube upload endpoint (simplified - would need actual YouTube API)
  app.post('/api/upload-to-youtube', upload.single('video'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No video file provided" });
      }

      const { sessionId, title } = req.body;
      
      // In a real implementation, you would:
      // 1. Upload to YouTube using YouTube Data API v3
      // 2. Set video metadata (title, description, privacy settings)
      // 3. Return the YouTube URL
      
      // For now, simulate the upload process
      const mockYouTubeUrl = `https://youtube.com/watch?v=mock-${sessionId}-${Date.now()}`;
      
      // Update the session with YouTube URL
      await storage.updateSessionRecording(sessionId, mockYouTubeUrl);
      
      // Clean up local file
      fs.unlinkSync(req.file.path);
      
      res.json({
        success: true,
        youtubeUrl: mockYouTubeUrl,
        message: "Video uploaded to YouTube successfully",
      });
    } catch (error) {
      console.error("YouTube upload error:", error);
      res.status(500).json({ message: "Failed to upload to YouTube" });
    }
  });

  // Serve uploaded files  
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  const server = createServer(app);

  // Setup WebSocket server for real-time communication
  const io = new SocketServer(server, {
    path: '/ws',
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Socket.io connection handling
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Join live class session
    socket.on('join-session', async ({ sessionId, userId }) => {
      try {
        socket.join(sessionId);
        
        // Track participant
        if (!sessionParticipants.has(sessionId)) {
          sessionParticipants.set(sessionId, new Set());
        }
        sessionParticipants.get(sessionId)?.add(userId);
        
        // Get current participants list
        const participants = await storage.getSessionParticipants(sessionId);
        
        // Notify all participants about updated list
        io.to(sessionId).emit('participants-updated', participants);
        
        console.log(`User ${userId} joined session ${sessionId}`);
      } catch (error) {
        console.error('Error joining session:', error);
      }
    });

    // Handle screen sharing
    socket.on('screen-share-started', async ({ sessionId, userId }) => {
      try {
        await storage.recordScreenShareEvent(sessionId, userId, 'start');
        socket.to(sessionId).emit('screen-share-started', { userId });
      } catch (error) {
        console.error('Screen share start error:', error);
      }
    });

    socket.on('screen-share-stopped', async ({ sessionId, userId }) => {
      try {
        await storage.recordScreenShareEvent(sessionId, userId, 'stop');
        socket.to(sessionId).emit('screen-share-stopped', { userId });
      } catch (error) {
        console.error('Screen share stop error:', error);
      }
    });

    // Handle recording
    socket.on('recording-started', async ({ sessionId }) => {
      try {
        await storage.updateSessionRecording(sessionId, null, true);
        io.to(sessionId).emit('recording-started');
      } catch (error) {
        console.error('Recording start error:', error);
      }
    });

    socket.on('recording-stopped', async ({ sessionId }) => {
      try {
        await storage.updateSessionRecording(sessionId, null, false);
        io.to(sessionId).emit('recording-stopped');
      } catch (error) {
        console.error('Recording stop error:', error);
      }
    });

    // Handle chat messages
    socket.on('send-message', async ({ sessionId, userId, message, timestamp, type }) => {
      try {
        const messageData = {
          id: crypto.randomUUID(),
          userId,
          userName: await storage.getUserName(userId),
          message,
          timestamp: new Date(timestamp),
          type: type || 'message',
        };
        
        // Broadcast message to all session participants
        io.to(sessionId).emit('new-message', messageData);
      } catch (error) {
        console.error('Chat message error:', error);
      }
    });

    // Handle hand raising
    socket.on('hand-toggled', async ({ sessionId, userId, raised }) => {
      try {
        await storage.updateParticipantHand(sessionId, userId, raised);
        const participants = await storage.getSessionParticipants(sessionId);
        io.to(sessionId).emit('participants-updated', participants);
      } catch (error) {
        console.error('Hand toggle error:', error);
      }
    });

    // Handle camera/mic status
    socket.on('camera-started', async ({ sessionId, userId }) => {
      try {
        await storage.updateParticipantCamera(sessionId, userId, true);
        const participants = await storage.getSessionParticipants(sessionId);
        io.to(sessionId).emit('participants-updated', participants);
      } catch (error) {
        console.error('Camera start error:', error);
      }
    });

    socket.on('camera-stopped', async ({ sessionId, userId }) => {
      try {
        await storage.updateParticipantCamera(sessionId, userId, false);
        const participants = await storage.getSessionParticipants(sessionId);
        io.to(sessionId).emit('participants-updated', participants);
      } catch (error) {
        console.error('Camera stop error:', error);
      }
    });

    // Handle class end
    socket.on('class-ended', async ({ sessionId }) => {
      try {
        await storage.endSession(sessionId);
        io.to(sessionId).emit('class-ended');
      } catch (error) {
        console.error('Class end error:', error);
      }
    });

    // Handle typing indicators
    socket.on('typing-start', ({ sessionId, userId }) => {
      socket.to(sessionId).emit('user-typing', { userId, typing: true });
    });

    socket.on('typing-stop', ({ sessionId, userId }) => {
      socket.to(sessionId).emit('user-typing', { userId, typing: false });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      
      // Clean up participant tracking
      for (const [sessionId, participants] of sessionParticipants.entries()) {
        // Note: In a production app, you'd need to track socket.id to userId mapping
        // For now, this is a simplified cleanup
      }
    });
  });
  
  return server;
}
