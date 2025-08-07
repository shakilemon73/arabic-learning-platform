// API utility functions for consistent data fetching
import { supabase } from '@/lib/supabase';
import type { 
  User, 
  CourseModule, 
  LiveClass, 
  ClassAttendance, 
  PaymentRecord, 
  HomeworkSubmission,
  LiveClassWithDetails,
  AttendanceWithClass
} from '@/lib/types';

// User Profile APIs
export const getUserProfile = async (userId: string): Promise<User | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
  return data;
};

export const updateUserProfile = async (userId: string, updates: Partial<User>): Promise<User | null> => {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating user profile:', error);
    return null;
  }
  return data;
};

// Course Module APIs
export const getCourseModules = async (): Promise<CourseModule[]> => {
  const { data, error } = await supabase
    .from('course_modules')
    .select('*')
    .eq('is_active', true)
    .order('level', { ascending: true })
    .order('order', { ascending: true });
  
  if (error) {
    console.error('Error fetching course modules:', error);
    return [];
  }
  return data || [];
};

// Live Class APIs
export const getLiveClasses = async (limit = 10): Promise<LiveClassWithDetails[]> => {
  const { data, error } = await supabase
    .from('live_classes')
    .select(`
      *,
      course_modules!inner (
        title,
        title_bn,
        level
      ),
      instructors!inner (
        name,
        name_bn,
        email
      )
    `)
    .eq('is_active', true)
    .order('scheduled_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('Error fetching live classes:', error);
    return [];
  }
  return data || [];
};

export const getUpcomingClasses = async (): Promise<LiveClassWithDetails[]> => {
  const { data, error } = await supabase
    .from('live_classes')
    .select(`
      *,
      course_modules!inner (
        title,
        title_bn,
        level
      ),
      instructors!inner (
        name,
        name_bn,
        email
      )
    `)
    .eq('is_active', true)
    .gte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true });
  
  if (error) {
    console.error('Error fetching upcoming classes:', error);
    return [];
  }
  return data || [];
};

// Attendance APIs
export const recordAttendance = async (userId: string, classId: string, duration: number): Promise<ClassAttendance | null> => {
  const { data, error } = await supabase
    .from('class_attendance')
    .insert({
      user_id: userId,
      class_id: classId,
      duration: duration,
      attended_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error recording attendance:', error);
    return null;
  }
  return data;
};

export const getUserAttendance = async (userId: string): Promise<AttendanceWithClass[]> => {
  const { data, error } = await supabase
    .from('class_attendance')
    .select(`
      *,
      live_classes!inner (
        title,
        title_bn,
        scheduled_at
      )
    `)
    .eq('user_id', userId)
    .order('attended_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching user attendance:', error);
    return [];
  }
  return data || [];
};

// Payment APIs
export const createPaymentRecord = async (userId: string, paymentData: {
  payment_id: string;
  payment_ref: string;
  amount: number;
  method: string;
  status: string;
  phone_number?: string;
}): Promise<PaymentRecord | null> => {
  const { data, error } = await supabase
    .from('payment_records')
    .insert({
      user_id: userId,
      ...paymentData
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating payment record:', error);
    return null;
  }
  return data;
};

export const updatePaymentStatus = async (paymentId: string, status: string, transactionId?: string): Promise<PaymentRecord | null> => {
  const updateData: any = { 
    status,
    updated_at: new Date().toISOString()
  };
  
  if (transactionId) {
    updateData.transaction_id = transactionId;
  }
  
  const { data, error } = await supabase
    .from('payment_records')
    .update(updateData)
    .eq('payment_id', paymentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating payment status:', error);
    return null;
  }
  return data;
};

// Homework APIs
export const createHomeworkSubmission = async (submissionData: {
  user_id: string;
  class_id: string;
  title: string;
  description?: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  status: string;
}): Promise<HomeworkSubmission | null> => {
  const { data, error } = await supabase
    .from('homework_submissions')
    .insert(submissionData)
    .select()
    .single();
  
  if (error) {
    console.error('Error creating homework submission:', error);
    return null;
  }
  return data;
};