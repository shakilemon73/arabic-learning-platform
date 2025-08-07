-- Arabic Learning Platform Database Schema
-- Complete database structure for real Supabase implementation

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
    profile_image_url TEXT,
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

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can only see and edit their own data
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

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