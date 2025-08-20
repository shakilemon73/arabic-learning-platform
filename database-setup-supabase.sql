-- Arabic Learning Platform - Video Conference Database Setup
-- Run this in Supabase SQL Editor

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can create SFU instances" ON sfu_instances;
DROP POLICY IF EXISTS "Users can read SFU instances" ON sfu_instances;
DROP POLICY IF EXISTS "Users can update SFU instances" ON sfu_instances;
DROP POLICY IF EXISTS "Allow SFU instance creation" ON sfu_instances;
DROP POLICY IF EXISTS "Allow SFU instance reading" ON sfu_instances;
DROP POLICY IF EXISTS "Allow SFU instance updates" ON sfu_instances;

-- Create SFU instances table if not exists
CREATE TABLE IF NOT EXISTS sfu_instances (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id VARCHAR NOT NULL,
    region VARCHAR NOT NULL DEFAULT 'us-east',
    max_participants INTEGER NOT NULL DEFAULT 100,
    current_participants INTEGER NOT NULL DEFAULT 0,
    cpu_usage DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    memory_usage DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    total_bandwidth INTEGER NOT NULL DEFAULT 0,
    status VARCHAR NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sfu_instances_room_id ON sfu_instances(room_id);
CREATE INDEX IF NOT EXISTS idx_sfu_instances_status ON sfu_instances(status);
CREATE INDEX IF NOT EXISTS idx_sfu_instances_region ON sfu_instances(region);

-- Enable Row Level Security
ALTER TABLE sfu_instances ENABLE ROW LEVEL SECURITY;

-- Create liberal RLS policies for video conferencing
CREATE POLICY "Enable all operations for SFU instances" ON sfu_instances 
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Create SFU load balancing requests table
CREATE TABLE IF NOT EXISTS sfu_load_balancing_requests (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    source_sfu VARCHAR NOT NULL,
    target_sfu VARCHAR NOT NULL,
    participants_to_migrate INTEGER NOT NULL,
    reason VARCHAR NOT NULL,
    status VARCHAR NOT NULL DEFAULT 'pending',
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- Enable RLS for load balancing
ALTER TABLE sfu_load_balancing_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all operations for load balancing" ON sfu_load_balancing_requests 
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Create video conference sessions table
CREATE TABLE IF NOT EXISTS video_conference_sessions (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id VARCHAR NOT NULL UNIQUE,
    class_id VARCHAR,
    host_user_id VARCHAR NOT NULL,
    title VARCHAR NOT NULL,
    description TEXT,
    max_participants INTEGER NOT NULL DEFAULT 50,
    current_participants INTEGER NOT NULL DEFAULT 0,
    status VARCHAR NOT NULL DEFAULT 'active',
    recording_enabled BOOLEAN NOT NULL DEFAULT false,
    chat_enabled BOOLEAN NOT NULL DEFAULT true,
    screen_share_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ
);

-- Enable RLS for video sessions
ALTER TABLE video_conference_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all operations for video sessions" ON video_conference_sessions 
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Create participant sessions table
CREATE TABLE IF NOT EXISTS video_participant_sessions (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR NOT NULL REFERENCES video_conference_sessions(id) ON DELETE CASCADE,
    user_id VARCHAR NOT NULL,
    display_name VARCHAR NOT NULL,
    role VARCHAR NOT NULL DEFAULT 'participant',
    is_muted BOOLEAN NOT NULL DEFAULT false,
    is_video_enabled BOOLEAN NOT NULL DEFAULT true,
    is_screen_sharing BOOLEAN NOT NULL DEFAULT false,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_at TIMESTAMPTZ
);

-- Enable RLS for participants
ALTER TABLE video_participant_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all operations for participants" ON video_participant_sessions 
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Create video stream metadata table
CREATE TABLE IF NOT EXISTS video_stream_metadata (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR NOT NULL REFERENCES video_conference_sessions(id) ON DELETE CASCADE,
    participant_id VARCHAR NOT NULL,
    stream_id VARCHAR NOT NULL,
    stream_type VARCHAR NOT NULL DEFAULT 'video', -- 'video', 'audio', 'screen'
    quality VARCHAR NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'ultra'
    bitrate INTEGER NOT NULL DEFAULT 1000,
    resolution_width INTEGER,
    resolution_height INTEGER,
    frame_rate INTEGER DEFAULT 30,
    codec VARCHAR DEFAULT 'VP8',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

-- Enable RLS for stream metadata
ALTER TABLE video_stream_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all operations for stream metadata" ON video_stream_metadata 
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Create functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for auto-updating timestamps
CREATE TRIGGER update_sfu_instances_updated_at 
    BEFORE UPDATE ON sfu_instances 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample SFU instance for testing
INSERT INTO sfu_instances (room_id, region, max_participants, status)
VALUES ('test-room', 'us-east', 100, 'active')
ON CONFLICT (room_id) DO NOTHING;

-- Show success message
SELECT 'Video Conference Database Setup Completed Successfully!' as status;