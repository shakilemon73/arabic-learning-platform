import {
  users,
  courseModules,
  liveClasses,
  instructors,
  classAttendance,
  paymentRecords,
  type User,
  type UpsertUser,
  type InsertUser,
  type CourseModule,
  type LiveClass,
  type Instructor,
  type ClassAttendance,
  type PaymentRecord,
  type InsertPaymentRecord,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Course enrollment operations
  createUser(userData: InsertUser): Promise<User>;
  updateUserPaymentStatus(userId: string, status: string): Promise<User>;
  updateCourseProgress(userId: string, progress: number): Promise<User>;
  
  // Payment operations for Bangladeshi gateways
  createPaymentRecord(userId: string, paymentData: Omit<InsertPaymentRecord, 'userId'>): Promise<PaymentRecord>;
  updatePaymentStatus(paymentId: string, status: string, transactionId?: string): Promise<PaymentRecord>;
  getPaymentRecords(userId: string): Promise<PaymentRecord[]>;
  
  // Course content operations
  getCourseModules(): Promise<CourseModule[]>;
  getLiveClasses(limit?: number): Promise<LiveClass[]>;
  getUpcomingClasses(): Promise<LiveClass[]>;
  getInstructors(): Promise<Instructor[]>;
  
  // Class attendance
  recordAttendance(userId: string, classId: string, duration: number): Promise<ClassAttendance>;
  getUserAttendance(userId: string): Promise<ClassAttendance[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        enrollmentStatus: "pending",
        paymentStatus: "unpaid",
      })
      .returning();
    return user;
  }

  async updateUserPaymentStatus(userId: string, status: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        paymentStatus: status,
        enrollmentStatus: status === "paid" ? "enrolled" : "pending",
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Payment operations for Bangladeshi gateways
  async createPaymentRecord(userId: string, paymentData: Omit<InsertPaymentRecord, 'userId'>): Promise<PaymentRecord> {
    const [payment] = await db
      .insert(paymentRecords)
      .values({
        ...paymentData,
        userId: userId,
      })
      .returning();
    return payment;
  }

  async updatePaymentStatus(paymentId: string, status: string, transactionId?: string): Promise<PaymentRecord> {
    const updateData: any = { 
      status: status, 
      updatedAt: new Date() 
    };
    
    if (transactionId) {
      updateData.transactionId = transactionId;
    }
    
    const [payment] = await db
      .update(paymentRecords)
      .set(updateData)
      .where(eq(paymentRecords.paymentId, paymentId))
      .returning();
    return payment;
  }

  async getPaymentRecords(userId: string): Promise<PaymentRecord[]> {
    return await db
      .select()
      .from(paymentRecords)
      .where(eq(paymentRecords.userId, userId))
      .orderBy(desc(paymentRecords.createdAt));
  }

  async updateCourseProgress(userId: string, progress: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        courseProgress: progress,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Course content operations
  async getCourseModules(): Promise<CourseModule[]> {
    return await db
      .select()
      .from(courseModules)
      .where(eq(courseModules.isActive, true))
      .orderBy(courseModules.level, courseModules.order);
  }

  async getLiveClasses(limit = 10): Promise<LiveClass[]> {
    return await db
      .select()
      .from(liveClasses)
      .where(eq(liveClasses.isActive, true))
      .orderBy(desc(liveClasses.scheduledAt))
      .limit(limit);
  }

  async getUpcomingClasses(): Promise<LiveClass[]> {
    return await db
      .select()
      .from(liveClasses)
      .where(eq(liveClasses.isActive, true))
      .orderBy(liveClasses.scheduledAt);
  }

  async getInstructors(): Promise<Instructor[]> {
    return await db
      .select()
      .from(instructors)
      .where(eq(instructors.isActive, true));
  }

  // Class attendance
  async recordAttendance(userId: string, classId: string, duration: number): Promise<ClassAttendance> {
    const [attendance] = await db
      .insert(classAttendance)
      .values({
        userId,
        classId,
        duration,
      })
      .returning();

    // Update user's classes attended count
    await db
      .update(users)
      .set({ 
        classesAttended: db.select().from(classAttendance).where(eq(classAttendance.userId, userId)).length + 1
      })
      .where(eq(users.id, userId));

    return attendance;
  }

  async getUserAttendance(userId: string): Promise<ClassAttendance[]> {
    return await db
      .select()
      .from(classAttendance)
      .where(eq(classAttendance.userId, userId))
      .orderBy(desc(classAttendance.attendedAt));
  }
}

export const storage = new DatabaseStorage();
