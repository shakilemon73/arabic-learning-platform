// Database types for TypeScript
export interface User {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  profile_image_url: string | null;
  phone: string | null;
  arabic_experience: string | null;
  enrollment_status: string;
  payment_status: string;
  course_progress: number;
  classes_attended: number;
  certificate_score: number;
  created_at: string;
  updated_at: string;
}

export interface CourseModule {
  id: string;
  title: string;
  title_bn: string;
  description: string | null;
  description_bn: string | null;
  level: number;
  order: number;
  is_active: boolean;
  created_at: string;
}

export interface LiveClass {
  id: string;
  title: string;
  title_bn: string;
  description: string | null;
  description_bn: string | null;
  module_id: string | null;
  instructor_id: string | null;
  scheduled_at: string;
  duration: number;
  meeting_url: string | null;
  recording_url: string | null;
  max_participants: number;
  is_active: boolean;
  created_at: string;
}

export interface ClassAttendance {
  id: string;
  user_id: string;
  class_id: string;
  duration: number;
  attended_at: string;
}

export interface PaymentRecord {
  id: string;
  user_id: string;
  payment_id: string;
  payment_ref: string;
  amount: number;
  method: string;
  status: string;
  phone_number: string | null;
  transaction_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface HomeworkSubmission {
  id: string;
  user_id: string;
  class_id: string;
  title: string;
  description: string | null;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  status: string;
  grade: number | null;
  feedback: string | null;
  submitted_at: string;
  graded_at: string | null;
}

// UI specific types
export interface AuthState {
  user: any | null;
  userProfile: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

export interface LiveClassWithDetails extends LiveClass {
  course_modules?: {
    title: string;
    title_bn: string;
    level: number;
  };
  instructors?: {
    name: string;
    name_bn: string;
    email: string;
  };
}

export interface AttendanceWithClass extends ClassAttendance {
  live_classes: {
    title: string;
    title_bn: string;
    scheduled_at: string;
  };
}