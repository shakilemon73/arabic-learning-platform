import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";
import crypto from "crypto";

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

  const httpServer = createServer(app);
  return httpServer;
}
