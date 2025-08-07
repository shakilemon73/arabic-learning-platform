export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string | null
          first_name: string | null
          last_name: string | null
          profile_image_url: string | null
          phone: string | null
          arabic_experience: string | null
          enrollment_status: string | null
          payment_status: string | null
          course_progress: number | null
          classes_attended: number | null
          certificate_score: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          profile_image_url?: string | null
          phone?: string | null
          arabic_experience?: string | null
          enrollment_status?: string | null
          payment_status?: string | null
          course_progress?: number | null
          classes_attended?: number | null
          certificate_score?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          profile_image_url?: string | null
          phone?: string | null
          arabic_experience?: string | null
          enrollment_status?: string | null
          payment_status?: string | null
          course_progress?: number | null
          classes_attended?: number | null
          certificate_score?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      course_modules: {
        Row: {
          id: string
          title: string
          title_bn: string
          description: string | null
          description_bn: string | null
          level: number
          order: number
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          title: string
          title_bn: string
          description?: string | null
          description_bn?: string | null
          level: number
          order: number
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          title_bn?: string
          description?: string | null
          description_bn?: string | null
          level?: number
          order?: number
          is_active?: boolean | null
          created_at?: string | null
        }
      }
      live_classes: {
        Row: {
          id: string
          title: string
          title_bn: string
          description: string | null
          description_bn: string | null
          module_id: string | null
          instructor_id: string | null
          scheduled_at: string
          duration: number | null
          meeting_url: string | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          title: string
          title_bn: string
          description?: string | null
          description_bn?: string | null
          module_id?: string | null
          instructor_id?: string | null
          scheduled_at: string
          duration?: number | null
          meeting_url?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          title_bn?: string
          description?: string | null
          description_bn?: string | null
          module_id?: string | null
          instructor_id?: string | null
          scheduled_at?: string
          duration?: number | null
          meeting_url?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
      }
      instructors: {
        Row: {
          id: string
          name: string
          name_bn: string
          email: string | null
          phone: string | null
          bio: string | null
          bio_bn: string | null
          profile_image_url: string | null
          specialization: string | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          name_bn: string
          email?: string | null
          phone?: string | null
          bio?: string | null
          bio_bn?: string | null
          profile_image_url?: string | null
          specialization?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          name_bn?: string
          email?: string | null
          phone?: string | null
          bio?: string | null
          bio_bn?: string | null
          profile_image_url?: string | null
          specialization?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
      }
      class_attendance: {
        Row: {
          id: string
          user_id: string | null
          class_id: string | null
          attended_at: string | null
          duration: number | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          class_id?: string | null
          attended_at?: string | null
          duration?: number | null
        }
        Update: {
          id?: string
          user_id?: string | null
          class_id?: string | null
          attended_at?: string | null
          duration?: number | null
        }
      }
      payment_records: {
        Row: {
          id: string
          user_id: string
          payment_id: string
          payment_ref: string
          amount: number
          method: string
          status: string
          transaction_id: string | null
          phone_number: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          payment_id: string
          payment_ref: string
          amount: number
          method: string
          status: string
          transaction_id?: string | null
          phone_number?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          payment_id?: string
          payment_ref?: string
          amount?: number
          method?: string
          status?: string
          transaction_id?: string | null
          phone_number?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      live_class_sessions: {
        Row: {
          id: string
          class_id: string | null
          instructor_id: string | null
          session_token: string
          is_active: boolean | null
          is_recording: boolean | null
          recording_url: string | null
          started_at: string | null
          ended_at: string | null
        }
        Insert: {
          id?: string
          class_id?: string | null
          instructor_id?: string | null
          session_token: string
          is_active?: boolean | null
          is_recording?: boolean | null
          recording_url?: string | null
          started_at?: string | null
          ended_at?: string | null
        }
        Update: {
          id?: string
          class_id?: string | null
          instructor_id?: string | null
          session_token?: string
          is_active?: boolean | null
          is_recording?: boolean | null
          recording_url?: string | null
          started_at?: string | null
          ended_at?: string | null
        }
      }
      homework_submissions: {
        Row: {
          id: string
          user_id: string | null
          class_id: string | null
          title: string
          description: string | null
          file_url: string | null
          file_name: string | null
          file_size: number | null
          status: string | null
          submitted_at: string | null
          graded_at: string | null
          grade: number | null
          feedback: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          class_id?: string | null
          title: string
          description?: string | null
          file_url?: string | null
          file_name?: string | null
          file_size?: number | null
          status?: string | null
          submitted_at?: string | null
          graded_at?: string | null
          grade?: number | null
          feedback?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          class_id?: string | null
          title?: string
          description?: string | null
          file_url?: string | null
          file_name?: string | null
          file_size?: number | null
          status?: string | null
          submitted_at?: string | null
          graded_at?: string | null
          grade?: number | null
          feedback?: string | null
        }
      }
      session_participants: {
        Row: {
          id: string
          session_id: string | null
          user_id: string | null
          joined_at: string | null
          left_at: string | null
          is_active: boolean | null
          participation_score: number | null
        }
        Insert: {
          id?: string
          session_id?: string | null
          user_id?: string | null
          joined_at?: string | null
          left_at?: string | null
          is_active?: boolean | null
          participation_score?: number | null
        }
        Update: {
          id?: string
          session_id?: string | null
          user_id?: string | null
          joined_at?: string | null
          left_at?: string | null
          is_active?: boolean | null
          participation_score?: number | null
        }
      }
      screen_share_events: {
        Row: {
          id: string
          session_id: string | null
          user_id: string | null
          event_type: string
          metadata: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          session_id?: string | null
          user_id?: string | null
          event_type: string
          metadata?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          session_id?: string | null
          user_id?: string | null
          event_type?: string
          metadata?: Json | null
          created_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}