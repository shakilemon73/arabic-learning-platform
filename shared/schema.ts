import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table with Arabic course specific fields
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  phone: varchar("phone"),
  arabicExperience: varchar("arabic_experience"), // beginner, basic, intermediate
  enrollmentStatus: varchar("enrollment_status").default("pending"), // pending, enrolled, completed
  paymentStatus: varchar("payment_status").default("unpaid"), // unpaid, paid, refunded
  courseProgress: integer("course_progress").default(0), // percentage completed
  classesAttended: integer("classes_attended").default(0),
  certificateScore: integer("certificate_score").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Course modules
export const courseModules = pgTable("course_modules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  titleBn: varchar("title_bn").notNull(), // Bengali title
  description: text("description"),
  descriptionBn: text("description_bn"), // Bengali description
  level: integer("level").notNull(), // 1 for basic, 2 for intermediate
  order: integer("order").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Live classes
export const liveClasses = pgTable("live_classes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  titleBn: varchar("title_bn").notNull(),
  description: text("description"),
  descriptionBn: text("description_bn"),
  moduleId: varchar("module_id").references(() => courseModules.id),
  instructorId: varchar("instructor_id").references(() => users.id),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").default(90), // minutes
  meetingUrl: varchar("meeting_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Class attendance
export const classAttendance = pgTable("class_attendance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  classId: varchar("class_id").references(() => liveClasses.id).notNull(),
  attendedAt: timestamp("attended_at").defaultNow(),
  duration: integer("duration").default(0), // minutes attended
});

// Instructors/Teachers
export const instructors = pgTable("instructors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  nameBn: varchar("name_bn").notNull(),
  title: varchar("title"),
  titleBn: varchar("title_bn"),
  university: varchar("university"),
  universityBn: varchar("university_bn"),
  experience: integer("experience").default(0), // years
  studentsCount: integer("students_count").default(0),
  profileImage: varchar("profile_image"),
  bio: text("bio"),
  bioBn: text("bio_bn"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Payment records for Bangladeshi payment methods
export const paymentRecords = pgTable("payment_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  paymentId: varchar("payment_id").notNull(), // bKash paymentID or transaction ID
  paymentRef: varchar("payment_ref").notNull(), // Internal reference
  amount: integer("amount").notNull(), // Amount in BDT
  method: varchar("method").notNull(), // bkash, nagad, rocket
  status: varchar("status").default("pending"), // pending, completed, failed, pending_verification
  transactionId: varchar("transaction_id"), // Final transaction ID from payment provider
  phoneNumber: varchar("phone_number"), // Customer's mobile number
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const upsertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  arabicExperience: true,
});

export const insertCourseModuleSchema = createInsertSchema(courseModules).omit({
  id: true,
  createdAt: true,
});

export const insertLiveClassSchema = createInsertSchema(liveClasses).omit({
  id: true,
  createdAt: true,
});

export const insertInstructorSchema = createInsertSchema(instructors).omit({
  id: true,
  createdAt: true,
});

export const insertPaymentRecordSchema = createInsertSchema(paymentRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type CourseModule = typeof courseModules.$inferSelect;
export type InsertCourseModule = z.infer<typeof insertCourseModuleSchema>;
export type LiveClass = typeof liveClasses.$inferSelect;
export type InsertLiveClass = z.infer<typeof insertLiveClassSchema>;
export type Instructor = typeof instructors.$inferSelect;
export type InsertInstructor = z.infer<typeof insertInstructorSchema>;
export type ClassAttendance = typeof classAttendance.$inferSelect;
export type PaymentRecord = typeof paymentRecords.$inferSelect;
export type InsertPaymentRecord = z.infer<typeof insertPaymentRecordSchema>;
