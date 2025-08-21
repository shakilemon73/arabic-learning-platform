-- Create users table for Arabic Learning Platform
-- Run this in your Supabase SQL Editor

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email varchar NOT NULL UNIQUE,
    first_name varchar,
    last_name varchar,
    phone varchar,
    avatar_url varchar,
    enrollment_status varchar DEFAULT 'pending' CHECK (enrollment_status IN ('pending', 'active', 'suspended', 'completed')),
    payment_status varchar DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue', 'canceled')),
    course_progress integer DEFAULT 0 CHECK (course_progress >= 0 AND course_progress <= 100),
    classes_attended integer DEFAULT 0 CHECK (classes_attended >= 0),
    certificate_score integer DEFAULT 0 CHECK (certificate_score >= 0 AND certificate_score <= 100),
    role varchar DEFAULT 'student' CHECK (role IN ('student', 'instructor', 'admin')),
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW()
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically create user profile when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.users (id, email, first_name, last_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'last_name', '')
    );
    RETURN NEW;
END;
$$;

-- Create trigger to automatically create user profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Allow service role to insert/update/delete (for admin functions)
CREATE POLICY "Service role can manage all users" ON users
    FOR ALL USING (auth.role() = 'service_role');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_enrollment_status ON users(enrollment_status);
CREATE INDEX IF NOT EXISTS idx_users_payment_status ON users(payment_status);

-- Insert existing auth users into users table (if any exist)
INSERT INTO users (id, email, first_name, last_name)
SELECT 
    id,
    email,
    COALESCE(raw_user_meta_data->>'first_name', split_part(email, '@', 1)),
    COALESCE(raw_user_meta_data->>'last_name', '')
FROM auth.users
ON CONFLICT (id) DO NOTHING;