-- WorldClass Video SDK Database Schema
-- Complete database setup for enterprise video conferencing features

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Rooms table - Video conference rooms
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    room_code VARCHAR(20) UNIQUE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    host_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    max_participants INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT false,
    password_hash VARCHAR(255), -- For password-protected rooms
    scheduled_start_time TIMESTAMP WITH TIME ZONE,
    scheduled_end_time TIMESTAMP WITH TIME ZONE,
    actual_start_time TIMESTAMP WITH TIME ZONE,
    actual_end_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Participants table - Users in video conferences
CREATE TABLE IF NOT EXISTS participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    user_role VARCHAR(20) DEFAULT 'participant' CHECK (user_role IN ('host', 'moderator', 'participant', 'viewer')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    is_connected BOOLEAN DEFAULT true,
    is_video_enabled BOOLEAN DEFAULT true,
    is_audio_enabled BOOLEAN DEFAULT true,
    is_screen_sharing BOOLEAN DEFAULT false,
    connection_quality VARCHAR(20) DEFAULT 'good' CHECK (connection_quality IN ('excellent', 'good', 'poor', 'disconnected')),
    removed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    removal_reason TEXT,
    UNIQUE(room_id, user_id)
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    display_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    message TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'emoji', 'file', 'system')),
    file_url TEXT,
    file_name VARCHAR(255),
    file_size BIGINT,
    reply_to UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
    is_edited BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat reactions table
CREATE TABLE IF NOT EXISTS chat_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name VARCHAR(255) NOT NULL,
    emoji VARCHAR(10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, user_id, emoji)
);

-- Recordings table
CREATE TABLE IF NOT EXISTS recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    initiated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT,
    file_size BIGINT,
    duration INTEGER DEFAULT 0, -- Duration in seconds
    status VARCHAR(20) DEFAULT 'recording' CHECK (status IN ('recording', 'processing', 'completed', 'failed')),
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    participants TEXT[], -- Array of participant user IDs
    recording_quality VARCHAR(20) DEFAULT 'medium' CHECK (recording_quality IN ('low', 'medium', 'high', 'hd')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Whiteboard actions table
CREATE TABLE IF NOT EXISTS whiteboard_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    display_name VARCHAR(255) NOT NULL,
    action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('pen', 'line', 'rectangle', 'circle', 'text', 'eraser', 'clear')),
    action_data JSONB NOT NULL, -- Drawing coordinates, text, etc.
    color VARCHAR(7), -- Hex color code
    stroke_width INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Moderation actions table
CREATE TABLE IF NOT EXISTS moderation_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    moderator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('mute', 'unmute', 'remove', 'promote', 'demote', 'spotlight', 'block_chat')),
    media_type VARCHAR(20) CHECK (media_type IN ('audio', 'video', 'both')),
    reason TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Participant permissions table
CREATE TABLE IF NOT EXISTS participant_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    can_speak BOOLEAN DEFAULT true,
    can_share_video BOOLEAN DEFAULT true,
    can_share_screen BOOLEAN DEFAULT true,
    can_chat BOOLEAN DEFAULT true,
    can_share_files BOOLEAN DEFAULT true,
    can_use_whiteboard BOOLEAN DEFAULT true,
    is_spotlighted BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(room_id, user_id)
);

-- Room settings table
CREATE TABLE IF NOT EXISTS room_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE UNIQUE,
    waiting_room_enabled BOOLEAN DEFAULT false,
    require_approval BOOLEAN DEFAULT false,
    mute_on_entry BOOLEAN DEFAULT false,
    disable_video_on_entry BOOLEAN DEFAULT false,
    allow_participant_screen_share BOOLEAN DEFAULT true,
    allow_participant_chat BOOLEAN DEFAULT true,
    allow_participant_file_share BOOLEAN DEFAULT true,
    max_participants INTEGER DEFAULT 100,
    recording_enabled BOOLEAN DEFAULT true,
    whiteboard_enabled BOOLEAN DEFAULT true,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stream quality logs table (for analytics)
CREATE TABLE IF NOT EXISTS stream_quality_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    quality_profile VARCHAR(20) NOT NULL,
    bandwidth_kbps INTEGER,
    latency_ms INTEGER,
    packet_loss_percent DECIMAL(5,2),
    reason VARCHAR(50),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rooms_active ON rooms(is_active, created_at);
CREATE INDEX IF NOT EXISTS idx_rooms_host ON rooms(host_user_id);
CREATE INDEX IF NOT EXISTS idx_participants_room_user ON participants(room_id, user_id);
CREATE INDEX IF NOT EXISTS idx_participants_room_connected ON participants(room_id, is_connected);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_time ON chat_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_reactions_message ON chat_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_recordings_room ON recordings(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whiteboard_room_time ON whiteboard_actions(room_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_moderation_room_time ON moderation_actions(room_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_permissions_room_user ON participant_permissions(room_id, user_id);
CREATE INDEX IF NOT EXISTS idx_quality_logs_room_time ON stream_quality_logs(room_id, timestamp DESC);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_messages_updated_at BEFORE UPDATE ON chat_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_participant_permissions_updated_at BEFORE UPDATE ON participant_permissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_room_settings_updated_at BEFORE UPDATE ON room_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security policies
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE whiteboard_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_quality_logs ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (can be customized based on requirements)

-- Rooms: Users can see rooms they're participants in or public rooms
CREATE POLICY "Users can view accessible rooms" ON rooms
    FOR SELECT USING (
        is_public = true 
        OR created_by = auth.uid() 
        OR host_user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM participants 
            WHERE participants.room_id = rooms.id 
            AND participants.user_id = auth.uid()
        )
    );

-- Participants: Users can see participants in rooms they're part of
CREATE POLICY "Users can view participants in their rooms" ON participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM participants p2 
            WHERE p2.room_id = participants.room_id 
            AND p2.user_id = auth.uid()
        )
    );

-- Chat messages: Users can see messages in rooms they're part of
CREATE POLICY "Users can view chat in their rooms" ON chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM participants 
            WHERE participants.room_id = chat_messages.room_id 
            AND participants.user_id = auth.uid()
        )
    );

-- Insert policies for authenticated users
CREATE POLICY "Authenticated users can create rooms" ON rooms
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can join rooms" ON participants
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());

CREATE POLICY "Participants can send messages" ON chat_messages
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' 
        AND user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM participants 
            WHERE participants.room_id = chat_messages.room_id 
            AND participants.user_id = auth.uid()
            AND participants.is_connected = true
        )
    );

-- Storage bucket for chat files and recordings
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('chat-files', 'chat-files', true),
    ('recordings', 'recordings', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload chat files"
ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'chat-files' 
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can view chat files"
ON storage.objects FOR SELECT USING (
    bucket_id = 'chat-files'
);

CREATE POLICY "Moderators can upload recordings"
ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'recordings' 
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Room participants can view recordings"
ON storage.objects FOR SELECT USING (
    bucket_id = 'recordings'
    -- Additional logic would be needed to check room membership
);

-- Function to generate room codes
CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS TEXT AS $$
BEGIN
    RETURN UPPER(
        SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)
    );
END;
$$ LANGUAGE plpgsql;

-- Function to automatically set room code on insert
CREATE OR REPLACE FUNCTION set_room_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.room_code IS NULL THEN
        NEW.room_code := generate_room_code();
        -- Ensure uniqueness
        WHILE EXISTS (SELECT 1 FROM rooms WHERE room_code = NEW.room_code) LOOP
            NEW.room_code := generate_room_code();
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_room_code_trigger
    BEFORE INSERT ON rooms
    FOR EACH ROW
    EXECUTE FUNCTION set_room_code();

-- Function to automatically end room when last participant leaves
CREATE OR REPLACE FUNCTION check_room_empty()
RETURNS TRIGGER AS $$
BEGIN
    -- If this was the last connected participant
    IF OLD.is_connected = true AND NEW.is_connected = false THEN
        -- Check if room is now empty
        IF NOT EXISTS (
            SELECT 1 FROM participants 
            WHERE participants.room_id = NEW.room_id 
            AND participants.is_connected = true
        ) THEN
            -- Mark room as inactive
            UPDATE rooms 
            SET is_active = false, actual_end_time = NOW()
            WHERE rooms.id = NEW.room_id AND rooms.is_active = true;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_room_empty_trigger
    AFTER UPDATE ON participants
    FOR EACH ROW
    EXECUTE FUNCTION check_room_empty();

-- Sample data for testing (optional)
-- INSERT INTO rooms (name, description, host_user_id, max_participants) 
-- VALUES ('Arabic Learning Session', 'Interactive Arabic language learning with Quran study', auth.uid(), 50);

COMMENT ON TABLE rooms IS 'Video conference rooms with scheduling and settings';
COMMENT ON TABLE participants IS 'Users participating in video conferences';
COMMENT ON TABLE chat_messages IS 'Real-time chat messages within rooms';
COMMENT ON TABLE recordings IS 'Session recordings with cloud storage';
COMMENT ON TABLE whiteboard_actions IS 'Interactive whiteboard drawing actions';
COMMENT ON TABLE moderation_actions IS 'Moderator actions and room management';
COMMENT ON TABLE participant_permissions IS 'Individual participant permissions';
COMMENT ON TABLE room_settings IS 'Room-specific configuration settings';