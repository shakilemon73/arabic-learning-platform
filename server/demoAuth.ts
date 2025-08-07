import type { Express, RequestHandler } from "express";
import { storage } from "./storage";

// Demo users for testing
const demoUsers = [
  {
    id: 'demo-teacher-1',
    email: 'teacher@demo.com',
    firstName: 'Sarah',
    lastName: 'Ahmed',
    role: 'teacher',
    profileImageUrl: null
  },
  {
    id: 'demo-student-1', 
    email: 'student1@demo.com',
    firstName: 'Ahmad',
    lastName: 'Hassan',
    role: 'student',
    profileImageUrl: null
  },
  {
    id: 'demo-student-2',
    email: 'student2@demo.com', 
    firstName: 'Fatima',
    lastName: 'Khan',
    role: 'student',
    profileImageUrl: null
  }
];

export async function setupDemoAuth(app: Express) {
  console.log('🎭 Setting up demo authentication system');
  
  // Create demo users in database
  for (const user of demoUsers) {
    try {
      await storage.upsertUser(user);
    } catch (error) {
      console.log(`Demo user ${user.email} already exists or error creating:`, error);
    }
  }

  // Demo login endpoint
  app.post('/api/demo/login', async (req, res) => {
    try {
      const { userType } = req.body;
      
      let selectedUser;
      if (userType === 'teacher') {
        selectedUser = demoUsers[0];
      } else if (userType === 'student1') {
        selectedUser = demoUsers[1]; 
      } else if (userType === 'student2') {
        selectedUser = demoUsers[2];
      } else {
        selectedUser = demoUsers[0]; // default to teacher
      }

      // Set user in session
      (req as any).session.demoUser = {
        claims: {
          sub: selectedUser.id,
          email: selectedUser.email,
          first_name: selectedUser.firstName,
          last_name: selectedUser.lastName,
          name: `${selectedUser.firstName} ${selectedUser.lastName}`,
          role: selectedUser.role
        }
      };

      res.json({ 
        success: true, 
        user: selectedUser,
        message: `Logged in as ${selectedUser.firstName} ${selectedUser.lastName} (${selectedUser.role})`
      });
    } catch (error) {
      console.error('Demo login error:', error);
      res.status(500).json({ message: 'Demo login failed' });
    }
  });

  // Demo logout endpoint
  app.post('/api/demo/logout', (req, res) => {
    (req as any).session.demoUser = null;
    res.json({ success: true, message: 'Logged out successfully' });
  });

  // Demo user info endpoint
  app.get('/api/demo/users', (req, res) => {
    res.json(demoUsers.map(user => ({
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      role: user.role
    })));
  });
}

export const isDemoAuthenticated: RequestHandler = (req, res, next) => {
  const demoUser = (req as any).session?.demoUser;
  
  if (demoUser) {
    (req as any).user = demoUser;
    return next();
  }
  
  res.status(401).json({ message: "Demo authentication required" });
};