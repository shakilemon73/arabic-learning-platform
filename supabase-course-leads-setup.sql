-- Course Leads Table Setup for Supabase
-- Run this script in your Supabase SQL Editor

-- Create enum types if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_source') THEN
        CREATE TYPE lead_source AS ENUM ('facebook', 'google', 'organic', 'referral');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_status') THEN
        CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'converted', 'not_interested');
    END IF;
END
$$;

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing table if it exists (to recreate with proper schema)
DROP TABLE IF EXISTS course_leads CASCADE;

-- Create course leads table for Facebook ad prospects and lead generation
CREATE TABLE course_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    email VARCHAR(255), -- Made optional as requested
    phone VARCHAR(20),
    address TEXT, -- Added address field as requested
    arabic_experience VARCHAR(50), -- 'beginner', 'basic', 'intermediate'
    interest_level VARCHAR(20) DEFAULT 'high', -- 'high', 'medium', 'low'
    source lead_source DEFAULT 'facebook',
    status lead_status DEFAULT 'new',
    utm_campaign VARCHAR(100),
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    notes TEXT,
    contacted_at TIMESTAMPTZ,
    converted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_course_leads_email ON course_leads(email);
CREATE INDEX idx_course_leads_source ON course_leads(source);
CREATE INDEX idx_course_leads_status ON course_leads(status);
CREATE INDEX idx_course_leads_created_at ON course_leads(created_at);

-- Create function for updating updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at timestamp
CREATE TRIGGER update_course_leads_updated_at 
    BEFORE UPDATE ON course_leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE course_leads ENABLE ROW LEVEL SECURITY;

-- Allow anyone to submit course leads (for Facebook ad prospects)
CREATE POLICY "Anyone can submit course leads" ON course_leads FOR INSERT WITH CHECK (true);

-- Allow public read for leads (you can restrict this later for admins only)
CREATE POLICY "Allow public read for now" ON course_leads FOR SELECT USING (true);

-- Verify the table was created successfully
SELECT 'Course leads table created successfully!' as status;
SELECT table_name, column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'course_leads' 
ORDER BY ordinal_position;