-- Arabic Learning Platform Database Schema
-- This file sets up all the necessary tables for the platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE,
    first_name TEXT,
    last_name TEXT,
    profile_image_url TEXT,
    phone TEXT,
    arabic_experience TEXT,
    enrollment_status TEXT DEFAULT 'pending',
    payment_status TEXT DEFAULT 'unpaid',
    course_progress INTEGER DEFAULT 0,
    classes_attended INTEGER DEFAULT 0,
    certificate_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Course modules table
CREATE TABLE IF NOT EXISTS public.course_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    title_bn TEXT NOT NULL,
    description TEXT,
    description_bn TEXT,
    level INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Instructors table
CREATE TABLE IF NOT EXISTS public.instructors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    name_bn TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    profile_image_url TEXT,
    bio TEXT,
    bio_bn TEXT,
    specialization TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Live classes table
CREATE TABLE IF NOT EXISTS public.live_classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    title_bn TEXT NOT NULL,
    description TEXT,
    description_bn TEXT,
    module_id UUID REFERENCES course_modules(id),
    instructor_id UUID REFERENCES instructors(id),
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration INTEGER NOT NULL,
    meeting_url TEXT,
    recording_url TEXT,
    max_participants INTEGER DEFAULT 50,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Class attendance table
CREATE TABLE IF NOT EXISTS public.class_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    class_id UUID REFERENCES live_classes(id) ON DELETE CASCADE,
    duration INTEGER NOT NULL,
    attended_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, class_id)
);

-- Payment records table
CREATE TABLE IF NOT EXISTS public.payment_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    payment_id TEXT NOT NULL,
    payment_ref TEXT,
    amount INTEGER NOT NULL,
    method TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    phone_number TEXT,
    transaction_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Homework submissions table
CREATE TABLE IF NOT EXISTS public.homework_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    class_id UUID REFERENCES live_classes(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT,
    file_name TEXT,
    file_size INTEGER,
    status TEXT DEFAULT 'submitted',
    grade INTEGER,
    feedback TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    graded_at TIMESTAMP WITH TIME ZONE
);

-- Function to handle updated_at timestamps
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at triggers
CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER payment_records_updated_at
    BEFORE UPDATE ON payment_records
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- Set up Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Anyone can insert users" ON public.users
    FOR INSERT WITH CHECK (true);

-- RLS Policies for course modules (public read)
CREATE POLICY "Anyone can view course modules" ON public.course_modules
    FOR SELECT USING (is_active = true);

-- RLS Policies for instructors (public read)
CREATE POLICY "Anyone can view active instructors" ON public.instructors
    FOR SELECT USING (is_active = true);

-- RLS Policies for live classes (public read)
CREATE POLICY "Anyone can view active classes" ON public.live_classes
    FOR SELECT USING (is_active = true);

-- RLS Policies for class attendance
CREATE POLICY "Users can view their own attendance" ON public.class_attendance
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own attendance" ON public.class_attendance
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for payment records
CREATE POLICY "Users can view their own payments" ON public.payment_records
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payments" ON public.payment_records
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for homework submissions
CREATE POLICY "Users can view their own submissions" ON public.homework_submissions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own submissions" ON public.homework_submissions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own submissions" ON public.homework_submissions
    FOR UPDATE USING (auth.uid() = user_id);

-- Insert sample data for course modules
INSERT INTO public.course_modules (title, title_bn, description, description_bn, level, "order") VALUES
('Arabic Alphabet', 'আরবি বর্ণমালা', 'Learn the Arabic alphabet and basic pronunciation', 'আরবি বর্ণমালা এবং মৌলিক উচ্চারণ শিখুন', 1, 1),
('Basic Vocabulary', 'মৌলিক শব্দভাণ্ডার', 'Essential Arabic words for daily use', 'দৈনন্দিন ব্যবহারের জন্য প্রয়োজনীয় আরবি শব্দ', 1, 2),
('Quranic Arabic', 'কুরআনিক আরবি', 'Understanding Arabic in the context of Quran', 'কুরআনের প্রেক্ষাপটে আরবি বুঝা', 2, 3),
('Advanced Grammar', 'উন্নত ব্যাকরণ', 'Deep dive into Arabic grammar rules', 'আরবি ব্যাকরণের নিয়মগুলির গভীর অধ্যয়ন', 3, 4)
ON CONFLICT DO NOTHING;

-- Insert sample instructors
INSERT INTO public.instructors (name, name_bn, email, bio, bio_bn, specialization) VALUES
('Dr. Ahmed Rahman', 'ড. আহমেদ রহমান', 'ahmed@arabiclearning.com', 'PhD in Arabic Language and Literature', 'আরবি ভাষা ও সাহিত্যে পিএইচডি', 'Quranic Arabic'),
('Ustadha Fatima Al-Zahra', 'উস্তাদা ফাতিমা আল-জাহরা', 'fatima@arabiclearning.com', 'Expert in Arabic Grammar and Tajweed', 'আরবি ব্যাকরণ ও তাজবিদের বিশেষজ্ঞ', 'Grammar & Tajweed')
ON CONFLICT DO NOTHING;

-- Insert sample live classes
INSERT INTO public.live_classes (title, title_bn, description, description_bn, module_id, instructor_id, scheduled_at, duration) VALUES
('Introduction to Arabic Letters', 'আরবি অক্ষরের পরিচয়', 'First step in learning Arabic alphabet', 'আরবি বর্ণমালা শেখার প্রথম ধাপ', 
 (SELECT id FROM course_modules WHERE title = 'Arabic Alphabet' LIMIT 1),
 (SELECT id FROM instructors WHERE name = 'Dr. Ahmed Rahman' LIMIT 1),
 NOW() + INTERVAL '1 day', 60),
('Basic Arabic Words', 'মৌলিক আরবি শব্দ', 'Learn essential Arabic vocabulary', 'প্রয়োজনীয় আরবি শব্দভাণ্ডার শিখুন',
 (SELECT id FROM course_modules WHERE title = 'Basic Vocabulary' LIMIT 1),
 (SELECT id FROM instructors WHERE name = 'Ustadha Fatima Al-Zahra' LIMIT 1),
 NOW() + INTERVAL '2 days', 90)
ON CONFLICT DO NOTHING;