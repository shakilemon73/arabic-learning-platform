-- Complete Database Setup for Arabic Learning Platform
-- Run this in your Supabase SQL Editor to set up all required tables

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE enrollment_status AS ENUM ('pending', 'enrolled', 'completed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE payment_method AS ENUM ('bkash', 'nagad', 'rocket');
CREATE TYPE homework_status AS ENUM ('pending', 'submitted', 'graded');
CREATE TYPE user_role AS ENUM ('student', 'instructor', 'admin');

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    display_name VARCHAR(200),
    profile_image_url TEXT,
    avatar_url TEXT,
    phone VARCHAR(20),
    arabic_experience VARCHAR(50),
    enrollment_status enrollment_status DEFAULT 'pending',
    payment_status payment_status DEFAULT 'pending',
    course_progress INTEGER DEFAULT 0,
    classes_attended INTEGER DEFAULT 0,
    certificate_score INTEGER DEFAULT 0,
    role user_role DEFAULT 'student',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Video conference participants table
CREATE TABLE IF NOT EXISTS video_conference_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('host', 'moderator', 'participant')),
    is_video_enabled BOOLEAN DEFAULT true,
    is_audio_enabled BOOLEAN DEFAULT true,
    is_hand_raised BOOLEAN DEFAULT false,
    connection_quality TEXT DEFAULT 'excellent',
    is_screen_sharing BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    UNIQUE(room_id, user_id)
);

-- Instructors table
CREATE TABLE IF NOT EXISTS instructors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    name_bn VARCHAR(100),
    email VARCHAR(255) UNIQUE NOT NULL,
    bio TEXT,
    bio_bn TEXT,
    qualifications TEXT,
    qualifications_bn TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Course modules table
CREATE TABLE IF NOT EXISTS course_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    title_bn VARCHAR(200),
    description TEXT,
    description_bn TEXT,
    level INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Live classes table
CREATE TABLE IF NOT EXISTS live_classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    title_bn VARCHAR(200),
    description TEXT,
    description_bn TEXT,
    module_id UUID REFERENCES course_modules(id),
    instructor_id UUID REFERENCES instructors(id),
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration INTEGER NOT NULL DEFAULT 90, -- in minutes
    meeting_url TEXT,
    recording_url TEXT,
    max_participants INTEGER DEFAULT 30,
    current_participants INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Class attendance table
CREATE TABLE IF NOT EXISTS class_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    class_id UUID REFERENCES live_classes(id) ON DELETE CASCADE,
    duration INTEGER NOT NULL, -- in minutes
    attended_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, class_id)
);

-- Payment records table
CREATE TABLE IF NOT EXISTS payment_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    payment_id VARCHAR(100) UNIQUE NOT NULL,
    payment_ref VARCHAR(100),
    amount DECIMAL(10,2) NOT NULL DEFAULT 600.00,
    method payment_method NOT NULL,
    status payment_status DEFAULT 'pending',
    phone_number VARCHAR(20),
    transaction_id VARCHAR(100),
    verification_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Homework submissions table
CREATE TABLE IF NOT EXISTS homework_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    class_id UUID REFERENCES live_classes(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    file_url TEXT,
    file_name VARCHAR(255),
    file_size INTEGER,
    status homework_status DEFAULT 'pending',
    grade INTEGER CHECK (grade >= 0 AND grade <= 100),
    feedback TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    graded_at TIMESTAMPTZ
);

-- Chat messages table (for live class chat)
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID REFERENCES live_classes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'emoji', 'system'
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_enrollment_status ON users(enrollment_status);
CREATE INDEX IF NOT EXISTS idx_video_conference_participants_room ON video_conference_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_video_conference_participants_user ON video_conference_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_live_classes_scheduled_at ON live_classes(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_class_attendance_user_id ON class_attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_class_attendance_class_id ON class_attendance(class_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_user_id ON payment_records(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_status ON payment_records(status);
CREATE INDEX IF NOT EXISTS idx_homework_submissions_user_id ON homework_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_class_id ON chat_messages(class_id);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_records_updated_at BEFORE UPDATE ON payment_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- **CRITICAL: Automatic user profile creation trigger**
-- This ensures that when a user signs up via Supabase Auth, 
-- a corresponding row is automatically created in the users table
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (
        id, 
        email, 
        first_name, 
        display_name,
        role,
        enrollment_status,
        payment_status,
        course_progress,
        classes_attended,
        certificate_score
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
        'student',
        'pending',
        'pending',
        0,
        0,
        0
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table to automatically create user profiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_conference_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can only see and edit their own data
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Video conference participant policies
CREATE POLICY "Users can view participants in same room" ON video_conference_participants 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM video_conference_participants vcp 
            WHERE vcp.room_id = video_conference_participants.room_id 
            AND vcp.user_id = auth.uid()
        )
    );
CREATE POLICY "Users can insert own participation" ON video_conference_participants 
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own participation" ON video_conference_participants 
    FOR UPDATE USING (auth.uid() = user_id);

-- Attendance policies
CREATE POLICY "Users can view own attendance" ON class_attendance FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own attendance" ON class_attendance FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Payment policies
CREATE POLICY "Users can view own payments" ON payment_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own payments" ON payment_records FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Homework policies
CREATE POLICY "Users can view own homework" ON homework_submissions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own homework" ON homework_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own homework" ON homework_submissions FOR UPDATE USING (auth.uid() = user_id);

-- Chat policies
CREATE POLICY "Users can view class chat" ON chat_messages FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM class_attendance 
        WHERE class_id = chat_messages.class_id AND user_id = auth.uid()
    )
);
CREATE POLICY "Users can send messages" ON chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Public read policies for reference data
CREATE POLICY "Anyone can view course modules" ON course_modules FOR SELECT USING (true);
CREATE POLICY "Anyone can view live classes" ON live_classes FOR SELECT USING (true);
CREATE POLICY "Anyone can view instructors" ON instructors FOR SELECT USING (true);

-- Insert sample data for testing
INSERT INTO course_modules (title, title_bn, description, description_bn, level, "order") VALUES
('Arabic Alphabet', 'আরবি বর্ণমালা', 'Learn the Arabic alphabet and pronunciation', 'আরবি বর্ণমালা এবং উচ্চারণ শিখুন', 1, 1),
('Basic Words', 'মৌলিক শব্দ', 'Learn common Arabic words', 'সাধারণ আরবি শব্দ শিখুন', 1, 2),
('Simple Sentences', 'সহজ বাক্য', 'Form simple Arabic sentences', 'সহজ আরবি বাক্য গঠন করুন', 2, 3)
ON CONFLICT DO NOTHING;

INSERT INTO instructors (name, name_bn, email, bio, bio_bn, qualifications, qualifications_bn) VALUES
('Ustaz Ahmed', 'উস্তাজ আহমেদ', 'ahmed@example.com', 'Experienced Arabic teacher', 'অভিজ্ঞ আরবি শিক্ষক', 'Masters in Arabic Literature', 'আরবি সাহিত্যে স্নাতকোত্তর'),
('Ustaza Fatima', 'উস্তাজা ফাতিমা', 'fatima@example.com', 'Specialist in Quranic Arabic', 'কুরআনিক আরবিতে বিশেষজ্ঞ', 'PhD in Islamic Studies', 'ইসলামিক স্টাডিজে পিএইচডি')
ON CONFLICT DO NOTHING;

INSERT INTO live_classes (title, title_bn, description, description_bn, module_id, instructor_id, scheduled_at) VALUES
('Introduction to Arabic', 'আরবির পরিচয়', 'First class introducing Arabic language', 'আরবি ভাষার পরিচয়ের প্রথম ক্লাস', 
 (SELECT id FROM course_modules WHERE title = 'Arabic Alphabet' LIMIT 1),
 (SELECT id FROM instructors WHERE name = 'Ustaz Ahmed' LIMIT 1),
 NOW() + INTERVAL '1 day'),
('Arabic Letters Practice', 'আরবি অক্ষর অনুশীলন', 'Practice writing Arabic letters', 'আরবি অক্ষর লেখার অনুশীলন',
 (SELECT id FROM course_modules WHERE title = 'Arabic Alphabet' LIMIT 1),
 (SELECT id FROM instructors WHERE name = 'Ustaza Fatima' LIMIT 1),
 NOW() + INTERVAL '2 days')
ON CONFLICT DO NOTHING;

-- Success message
SELECT 'Database setup completed successfully! All tables created and triggers configured.' AS setup_status;