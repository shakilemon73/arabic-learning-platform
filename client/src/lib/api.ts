// Real API functions using Supabase with security enhancements
import { supabase } from './supabase';
import { securityManager } from './security';
import type { 
  User, 
  CourseModule, 
  LiveClass, 
  ClassAttendance, 
  PaymentRecord, 
  HomeworkSubmission,
  LiveClassWithDetails,
  AttendanceWithClass
} from './types';

// User functions
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

export const updateUserProfile = async (userId: string, updates: Partial<User>) => {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

export const createUserProfile = async (userId: string, profile: Partial<User>) => {
  const { data, error } = await supabase
    .from('users')
    .insert({ id: userId, ...profile })
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

// Course functions with timeout
export const getCourseModules = async (): Promise<CourseModule[]> => {
  try {
    const queryPromise = supabase
      .from('course_modules')
      .select('*')
      .eq('is_active', true)
      .order('order');

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Query timeout')), 3000)
    );

    const { data, error } = await Promise.race([queryPromise, timeoutPromise]);
    
    if (error) {
      console.error('getCourseModules error:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('getCourseModules error:', error);
    return [];
  }
};

// Live class functions with optimized performance
export const getLiveClasses = async (): Promise<LiveClassWithDetails[]> => {
  try {
    // Optimized query with timeout to prevent UI blocking
    const queryPromise = supabase
      .from('live_classes')
      .select(`
        id,
        title,
        title_bn,
        description,
        description_bn,
        module_id,
        instructor_id,
        scheduled_at,
        duration,
        meeting_url,
        recording_url,
        max_participants,
        current_participants,
        is_active,
        created_at,
        course_modules (
          title,
          title_bn,
          level
        ),
        instructors (
          name,
          name_bn,
          email
        )
      `)
      .eq('is_active', true)
      .order('scheduled_at')
      .limit(20); // Reduced limit for faster loading

    // Add timeout to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Query timeout')), 5000)
    );

    const { data, error } = await Promise.race([queryPromise, timeoutPromise]);
      
    if (error) {
      console.error('API Error - getLiveClasses:', error);
      // Return empty array instead of throwing to prevent UI blocking
      return [];
    }
    
    return (data || []) as unknown as LiveClassWithDetails[];
  } catch (error) {
    console.error('getLiveClasses error:', error);
    // Return empty array instead of throwing to prevent UI crash
    return [];
  }
};

export const getLiveClassById = async (classId: string): Promise<LiveClassWithDetails | null> => {
  const { data, error } = await supabase
    .from('live_classes')
    .select(`
      *,
      course_modules (
        title,
        title_bn,
        level
      ),
      instructors (
        name,
        name_bn,
        email
      )
    `)
    .eq('id', classId)
    .single();
    
  if (error) {
    console.error('Error fetching live class:', error);
    return null;
  }
  return data;
};

export const updateClassParticipants = async (classId: string, increment: boolean = true) => {
  const { data, error } = await supabase.rpc('update_class_participants', {
    class_id: classId,
    increment_count: increment
  });
  
  if (error) throw error;
  return data;
};

// Admin class management functions
export const createLiveClass = async (classData: Omit<LiveClass, 'id' | 'created_at' | 'current_participants'>) => {
  try {
    const { data, error } = await supabase
      .from('live_classes')
      .insert({
        ...classData,
        current_participants: 0
      })
      .select()
      .single();
      
    if (error) {
      console.error('Error creating live class:', error);
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Failed to create live class:', error);
    throw error;
  }
};

export const updateLiveClass = async (classId: string, updates: Partial<LiveClass>) => {
  try {
    const { data, error } = await supabase
      .from('live_classes')
      .update(updates)
      .eq('id', classId)
      .select()
      .single();
      
    if (error) {
      console.error('Error updating live class:', error);
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Failed to update live class:', error);
    throw error;
  }
};

export const deleteLiveClass = async (classId: string) => {
  try {
    const { error } = await supabase
      .from('live_classes')
      .delete()
      .eq('id', classId);
      
    if (error) {
      console.error('Error deleting live class:', error);
      throw error;
    }
    return true;
  } catch (error) {
    console.error('Failed to delete live class:', error);
    throw error;
  }
};

export const getAllInstructors = async () => {
  try {
    const queryPromise = supabase
      .from('instructors')
      .select('*')
      .eq('is_active', true)
      .order('name');

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Query timeout')), 3000)
    );

    const { data, error } = await Promise.race([queryPromise, timeoutPromise]);
    
    if (error) {
      console.error('getAllInstructors error:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('getAllInstructors error:', error);
    return [];
  }
};

// Attendance functions
export const getUserAttendance = async (userId: string): Promise<AttendanceWithClass[]> => {
  const { data, error } = await supabase
    .from('class_attendance')
    .select(`
      *,
      live_classes (
        title,
        title_bn,
        scheduled_at
      )
    `)
    .eq('user_id', userId)
    .order('attended_at', { ascending: false });
    
  if (error) throw error;
  return data || [];
};

export const recordAttendance = async (userId: string, classId: string, duration: number) => {
  const { data, error } = await supabase
    .from('class_attendance')
    .insert({
      user_id: userId,
      class_id: classId,
      duration
    })
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

// Payment functions
export const getUserPayments = async (userId: string): Promise<PaymentRecord[]> => {
  const { data, error } = await supabase
    .from('payment_records')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  return data || [];
};

export const createPaymentRecord = async (payment: Omit<PaymentRecord, 'id' | 'created_at' | 'updated_at'>) => {
  const { data, error } = await supabase
    .from('payment_records')
    .insert(payment)
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

export const updatePaymentStatus = async (paymentId: string, status: string, transactionId?: string) => {
  const updateData: any = { status };
  if (transactionId) updateData.transaction_id = transactionId;
  
  const { data, error } = await supabase
    .from('payment_records')
    .update(updateData)
    .eq('id', paymentId)
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

// Homework functions
export const getUserHomework = async (userId: string): Promise<HomeworkSubmission[]> => {
  const { data, error } = await supabase
    .from('homework_submissions')
    .select('*')
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false });
    
  if (error) throw error;
  return data || [];
};

export const submitHomework = async (homework: Omit<HomeworkSubmission, 'id' | 'submitted_at' | 'graded_at'>) => {
  const { data, error } = await supabase
    .from('homework_submissions')
    .insert(homework)
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

// Chat functions
export const getClassMessages = async (classId: string) => {
  const { data, error } = await supabase
    .from('chat_messages')
    .select(`
      *,
      users (
        first_name,
        last_name
      )
    `)
    .eq('class_id', classId)
    .order('sent_at');
    
  if (error) throw error;
  return data || [];
};

export const sendMessage = async (classId: string, userId: string, message: string) => {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      class_id: classId,
      user_id: userId,
      message
    })
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

// Real-time subscriptions
export const subscribeToClassMessages = (classId: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`class-${classId}`)
    .on('postgres_changes', 
      { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'chat_messages',
        filter: `class_id=eq.${classId}`
      }, 
      callback
    )
    .subscribe();
};

export const subscribeToClassUpdates = (classId: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`class-updates-${classId}`)
    .on('postgres_changes', 
      { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'live_classes',
        filter: `id=eq.${classId}`
      }, 
      callback
    )
    .subscribe();
};

// User registration with course enrollment
export const registerUserForCourse = async (userData: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  arabicExperience: string;
}) => {
  // This would be called after user signs up with Supabase Auth
  const user = supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');
  
  const profile = {
    first_name: userData.firstName,
    last_name: userData.lastName,
    email: userData.email,
    phone: userData.phone,
    arabic_experience: userData.arabicExperience,
    enrollment_status: 'pending' as const,
    payment_status: 'pending' as const
  };
  
  return createUserProfile((await user).data.user?.id!, profile);
};

// Progress tracking
export const updateUserProgress = async (userId: string, progress: number) => {
  const { data, error } = await supabase
    .from('users')
    .update({ 
      course_progress: progress,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

export const incrementClassesAttended = async (userId: string) => {
  const { data, error } = await supabase.rpc('increment_classes_attended', {
    user_id: userId
  });
  
  if (error) throw error;
  return data;
};