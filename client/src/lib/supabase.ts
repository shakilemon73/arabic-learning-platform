import { createClient } from '@supabase/supabase-js';

// Security: Validate environment variables without exposing fallbacks
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Security: Strict environment validation
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('🚨 CRITICAL: Missing Supabase environment variables');
  throw new Error('Missing required environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be configured');
}

// Security: Validate URL format
try {
  new URL(supabaseUrl);
} catch {
  throw new Error('Invalid VITE_SUPABASE_URL format. Must be a valid URL.');
}

// Security: Validate anon key format (JWT should have 3 parts)
if (!supabaseAnonKey.includes('.') || supabaseAnonKey.split('.').length !== 3) {
  throw new Error('Invalid VITE_SUPABASE_ANON_KEY format. Must be a valid JWT token.');
}

// Security: Enhanced Supabase client configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storageKey: 'sb-auth-token',
    storage: typeof window !== 'undefined' ? {
      getItem: (key: string) => {
        try {
          return window.localStorage.getItem(key);
        } catch (error) {
          console.warn('🔒 Secure storage access error:', error);
          return null;
        }
      },
      setItem: (key: string, value: string) => {
        try {
          // Security: Validate value before storing
          if (value && value.length > 50000) { // Reasonable limit
            console.warn('🔒 Storage value too large, rejecting');
            return;
          }
          window.localStorage.setItem(key, value);
        } catch (error) {
          console.warn('🔒 Secure storage write error:', error);
        }
      },
      removeItem: (key: string) => {
        try {
          window.localStorage.removeItem(key);
        } catch (error) {
          console.warn('🔒 Secure storage removal error:', error);
        }
      }
    } : undefined,
    debug: import.meta.env.DEV && false // Disable debug in production for security
  },
  global: {
    headers: {
      'X-Client-Info': 'arabic-learning-platform',
      'X-App-Version': '1.0.0',
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
    timeout: 30000, // 30 second timeout
    heartbeatIntervalMs: 30000, // Heartbeat every 30 seconds
  },
});

// Auth helper functions
export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signUp = async (email: string, password: string, metadata?: Record<string, any>) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata
    }
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  } catch (err) {
    return { user: null, error: err };
  }
};

// Database helper functions
export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  return { data, error };
};

export const updateUserProfile = async (userId: string, updates: any) => {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  return { data, error };
};

export const getCourseModules = async () => {
  const { data, error } = await supabase
    .from('course_modules')
    .select('*')
    .eq('is_active', true)
    .order('level', { ascending: true })
    .order('order', { ascending: true });
  return { data, error };
};

export const getLiveClasses = async (limit = 10) => {
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
    .eq('is_active', true)
    .order('scheduled_at', { ascending: false })
    .limit(limit);
  
  return { data, error };
};

export const getUpcomingClasses = async () => {
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
  return { data, error };
};

export const recordAttendance = async (userId: string, classId: string, duration: number) => {
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
  return { data, error };
};

export const getUserAttendance = async (userId: string) => {
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
  return { data, error };
};

export const createPaymentRecord = async (userId: string, paymentData: {
  payment_id: string;
  payment_ref: string;
  amount: number;
  method: string;
  status: string;
  phone_number?: string;
}) => {
  const { data, error } = await supabase
    .from('payment_records')
    .insert({
      user_id: userId,
      ...paymentData
    })
    .select()
    .single();
  return { data, error };
};

export const updatePaymentStatus = async (paymentId: string, status: string, transactionId?: string) => {
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
  return { data, error };
};

export const createHomeworkSubmission = async (submissionData: {
  user_id: string;
  class_id: string;
  title: string;
  description?: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  status: string;
}) => {
  const { data, error } = await supabase
    .from('homework_submissions')
    .insert(submissionData)
    .select()
    .single();
  return { data, error };
};

// Chat messages functions
export const getChatMessages = async (classId: string) => {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('class_id', classId)
    .order('sent_at', { ascending: true });
  return { data, error };
};

export const sendChatMessage = async (messageData: {
  class_id: string;
  user_id: string;
  message: string;
  message_type?: string;
}) => {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      ...messageData,
      message_type: messageData.message_type || 'text',
      sent_at: new Date().toISOString()
    })
    .select()
    .single();
  return { data, error };
};

// Chat reactions functions
export const addChatReaction = async (messageId: string, userId: string, emoji: string, displayName: string) => {
  const { data, error } = await supabase
    .from('chat_reactions')
    .insert({
      message_id: messageId,
      user_id: userId,
      display_name: displayName,
      emoji
    })
    .select()
    .single();
  return { data, error };
};

export const getChatReactions = async (messageId: string) => {
  const { data, error } = await supabase
    .from('chat_reactions')
    .select('*')
    .eq('message_id', messageId);
  return { data, error };
};

// Homework submissions functions  
export const getUserHomework = async (userId: string) => {
  const { data, error } = await supabase
    .from('homework_submissions')
    .select(`
      *,
      live_classes (
        title,
        title_bn,
        scheduled_at
      )
    `)
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false });
  return { data, error };
};

export const updateHomeworkStatus = async (submissionId: string, status: string, grade?: number, feedback?: string) => {
  const updateData: any = { status };
  if (grade !== undefined) updateData.grade = grade;
  if (feedback) updateData.feedback = feedback;
  if (status === 'graded') updateData.graded_at = new Date().toISOString();
  
  const { data, error } = await supabase
    .from('homework_submissions')
    .update(updateData)
    .eq('id', submissionId)
    .select()
    .single();
  return { data, error };
};