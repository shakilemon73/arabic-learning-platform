import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sgyanvjlwlrzcrpjwlsd.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNneWFudmpsd2xyemNycGp3bHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NTg1MjAsImV4cCI6MjA3MDEzNDUyMH0.5xjMdSUdeHGln68tfuw626q4xDZkuR8Xg_e_w6g9iJk';



if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment.');
}

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
          console.warn('Error accessing localStorage:', error);
          return null;
        }
      },
      setItem: (key: string, value: string) => {
        try {
          window.localStorage.setItem(key, value);
        } catch (error) {
          console.warn('Error setting localStorage:', error);
        }
      },
      removeItem: (key: string) => {
        try {
          window.localStorage.removeItem(key);
        } catch (error) {
          console.warn('Error removing from localStorage:', error);
        }
      }
    } : undefined,
    debug: import.meta.env.DEV
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-web',
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
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