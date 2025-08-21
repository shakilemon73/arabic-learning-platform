-- Production Video SDK Database Schema
-- Enterprise-grade schema for video conferencing like Zoom/Teams
-- Migration 001: Initial Schema

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- User profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'moderator', 'user')),
  permissions JSONB DEFAULT '{}',
  subscription JSONB DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  organization VARCHAR(255),
  avatar_url VARCHAR(500),
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints and indexes
  UNIQUE(user_id),
  UNIQUE(email)
);

-- Video rooms table
CREATE TABLE IF NOT EXISTS video_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  max_participants INTEGER DEFAULT 100 CHECK (max_participants > 0 AND max_participants <= 10000),
  current_participants INTEGER DEFAULT 0 CHECK (current_participants >= 0),
  is_private BOOLEAN DEFAULT false,
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'ended', 'paused')),
  
  -- Scheduling
  scheduled_start_time TIMESTAMP WITH TIME ZONE,
  scheduled_end_time TIMESTAMP WITH TIME ZONE,
  actual_start_time TIMESTAMP WITH TIME ZONE,
  actual_end_time TIMESTAMP WITH TIME ZONE,
  
  -- Room configuration
  settings JSONB DEFAULT '{}',
  
  -- Access control
  join_url VARCHAR(500),
  host_key VARCHAR(100),
  moderator_key VARCHAR(100),
  password_hash VARCHAR(255),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CHECK (scheduled_end_time IS NULL OR scheduled_start_time < scheduled_end_time),
  CHECK (actual_end_time IS NULL OR actual_start_time < actual_end_time)
);

-- Video participants table
CREATE TABLE IF NOT EXISTS video_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES video_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'participant' CHECK (role IN ('host', 'moderator', 'participant', 'viewer')),
  
  -- Session info
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE,
  leave_reason VARCHAR(255),
  
  -- Media state
  connection_quality VARCHAR(20) DEFAULT 'good' CHECK (connection_quality IN ('excellent', 'good', 'poor', 'critical')),
  is_muted BOOLEAN DEFAULT false,
  is_video_enabled BOOLEAN DEFAULT true,
  is_screen_sharing BOOLEAN DEFAULT false,
  
  -- Technical metadata
  user_agent TEXT,
  ip_address INET,
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(room_id, user_id, joined_at), -- Allow rejoining
  CHECK (left_at IS NULL OR joined_at < left_at)
);

-- SFU servers table (for load balancing)
CREATE TABLE IF NOT EXISTS sfu_servers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  server_id VARCHAR(100) UNIQUE NOT NULL,
  endpoint VARCHAR(500) NOT NULL,
  region VARCHAR(50) NOT NULL,
  
  -- Capacity management
  max_capacity INTEGER DEFAULT 1000,
  current_load INTEGER DEFAULT 0,
  
  -- Health monitoring
  status VARCHAR(20) DEFAULT 'healthy' CHECK (status IN ('healthy', 'degraded', 'critical', 'offline')),
  last_health_check TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  health_metrics JSONB DEFAULT '{}',
  
  -- Features
  features JSONB DEFAULT '{}',
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recording sessions table
CREATE TABLE IF NOT EXISTS recording_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES video_rooms(id) ON DELETE CASCADE,
  started_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Recording info
  status VARCHAR(50) DEFAULT 'recording' CHECK (status IN ('recording', 'processing', 'completed', 'failed')),
  recording_type VARCHAR(50) DEFAULT 'full' CHECK (recording_type IN ('full', 'audio_only', 'screen_only')),
  
  -- File info
  file_path VARCHAR(1000),
  file_size BIGINT,
  duration_seconds INTEGER,
  format VARCHAR(20) DEFAULT 'mp4',
  
  -- Quality settings
  quality_settings JSONB DEFAULT '{}',
  
  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Network metrics table (for analytics)
CREATE TABLE IF NOT EXISTS network_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES video_rooms(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES video_participants(id) ON DELETE CASCADE,
  
  -- Network measurements
  latency INTEGER, -- ms
  packet_loss DECIMAL(5,4), -- percentage (0.0001 = 0.01%)
  jitter INTEGER, -- ms
  bandwidth_upstream INTEGER, -- kbps
  bandwidth_downstream INTEGER, -- kbps
  
  -- Quality metrics
  video_quality VARCHAR(20),
  audio_quality VARCHAR(20),
  connection_type VARCHAR(50),
  
  -- Timestamp
  measured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Security events table
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  
  -- Context
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  room_id UUID REFERENCES video_rooms(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  
  -- Event details
  description TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Response
  blocked BOOLEAN DEFAULT false,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Moderator actions table
CREATE TABLE IF NOT EXISTS moderator_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES video_rooms(id) ON DELETE CASCADE,
  moderator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Action details
  action_type VARCHAR(100) NOT NULL,
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance analytics table
CREATE TABLE IF NOT EXISTS performance_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES video_rooms(id) ON DELETE CASCADE,
  
  -- Performance metrics
  metric_type VARCHAR(100) NOT NULL,
  metric_value DECIMAL(15,6),
  metric_unit VARCHAR(20),
  
  -- Context
  metadata JSONB DEFAULT '{}',
  
  -- Timestamp
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat messages table (for in-room chat)
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES video_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Message content
  message_type VARCHAR(50) DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'emoji', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  
  -- Moderation
  is_deleted BOOLEAN DEFAULT false,
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Breakout rooms table
CREATE TABLE IF NOT EXISTS breakout_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_room_id UUID REFERENCES video_rooms(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Room settings
  max_participants INTEGER DEFAULT 10,
  current_participants INTEGER DEFAULT 0,
  auto_assign BOOLEAN DEFAULT false,
  
  -- Status
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Breakout room assignments table
CREATE TABLE IF NOT EXISTS breakout_room_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  breakout_room_id UUID REFERENCES breakout_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Assignment info
  joined_at TIMESTAMP WITH TIME ZONE,
  left_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(breakout_room_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_video_rooms_created_by ON video_rooms(created_by);
CREATE INDEX idx_video_rooms_status ON video_rooms(status);
CREATE INDEX idx_video_rooms_scheduled_start ON video_rooms(scheduled_start_time) WHERE status = 'scheduled';

CREATE INDEX idx_video_participants_room_active ON video_participants(room_id, left_at) WHERE left_at IS NULL;
CREATE INDEX idx_video_participants_user ON video_participants(user_id);
CREATE INDEX idx_video_participants_joined_at ON video_participants(joined_at);

CREATE INDEX idx_recording_sessions_room ON recording_sessions(room_id);
CREATE INDEX idx_recording_sessions_status ON recording_sessions(status);

CREATE INDEX idx_network_metrics_room_measured ON network_metrics(room_id, measured_at);
CREATE INDEX idx_network_metrics_participant ON network_metrics(participant_id);

CREATE INDEX idx_security_events_severity_created ON security_events(severity, created_at);
CREATE INDEX idx_security_events_user ON security_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_security_events_ip ON security_events(ip_address) WHERE ip_address IS NOT NULL;

CREATE INDEX idx_moderator_actions_room ON moderator_actions(room_id);
CREATE INDEX idx_moderator_actions_moderator ON moderator_actions(moderator_id);

CREATE INDEX idx_performance_analytics_room_type ON performance_analytics(room_id, metric_type);
CREATE INDEX idx_performance_analytics_recorded ON performance_analytics(recorded_at);

CREATE INDEX idx_chat_messages_room_created ON chat_messages(room_id, created_at);
CREATE INDEX idx_chat_messages_user ON chat_messages(user_id);

CREATE INDEX idx_breakout_rooms_parent ON breakout_rooms(parent_room_id);
CREATE INDEX idx_breakout_room_assignments_room ON breakout_room_assignments(breakout_room_id);

-- Create functions for common operations
CREATE OR REPLACE FUNCTION update_room_participant_count(room_uuid UUID, delta_count INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE video_rooms 
  SET current_participants = GREATEST(0, current_participants + delta_count),
      updated_at = NOW()
  WHERE id = room_uuid;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_active_participants_count(room_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM video_participants
    WHERE room_id = room_uuid AND left_at IS NULL
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_old_metrics()
RETURNS VOID AS $$
BEGIN
  -- Delete network metrics older than 7 days
  DELETE FROM network_metrics 
  WHERE measured_at < NOW() - INTERVAL '7 days';
  
  -- Delete security events older than 30 days (except critical ones)
  DELETE FROM security_events 
  WHERE created_at < NOW() - INTERVAL '30 days' 
    AND severity != 'critical';
  
  -- Delete performance analytics older than 30 days
  DELETE FROM performance_analytics 
  WHERE recorded_at < NOW() - INTERVAL '30 days';
  
  -- Archive ended rooms older than 90 days
  UPDATE video_rooms 
  SET status = 'archived'
  WHERE status = 'ended' 
    AND actual_end_time < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_video_rooms_updated_at 
  BEFORE UPDATE ON video_rooms 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_video_participants_updated_at 
  BEFORE UPDATE ON video_participants 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sfu_servers_updated_at 
  BEFORE UPDATE ON sfu_servers 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recording_sessions_updated_at 
  BEFORE UPDATE ON recording_sessions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE recording_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can view rooms they created or joined
CREATE POLICY "Users can view their rooms" ON video_rooms
  FOR SELECT USING (
    auth.uid() = created_by OR 
    EXISTS (
      SELECT 1 FROM video_participants 
      WHERE video_participants.room_id = video_rooms.id 
        AND video_participants.user_id = auth.uid()
    )
  );

-- Users can create rooms
CREATE POLICY "Users can create rooms" ON video_rooms
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Room creators can update their rooms
CREATE POLICY "Creators can update their rooms" ON video_rooms
  FOR UPDATE USING (auth.uid() = created_by);

-- Participants can view other participants in same room
CREATE POLICY "View participants in same room" ON video_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM video_participants AS my_participation
      WHERE my_participation.room_id = video_participants.room_id
        AND my_participation.user_id = auth.uid()
    )
  );

-- Users can join rooms
CREATE POLICY "Users can join rooms" ON video_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own participation
CREATE POLICY "Users can update their participation" ON video_participants
  FOR UPDATE USING (auth.uid() = user_id);

-- Chat messages are visible to room participants
CREATE POLICY "View chat in joined rooms" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM video_participants
      WHERE video_participants.room_id = chat_messages.room_id
        AND video_participants.user_id = auth.uid()
        AND video_participants.left_at IS NULL
    )
  );

-- Users can send chat messages in rooms they've joined
CREATE POLICY "Send chat in joined rooms" ON chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM video_participants
      WHERE video_participants.room_id = chat_messages.room_id
        AND video_participants.user_id = auth.uid()
        AND video_participants.left_at IS NULL
    )
  );

-- Initial data
INSERT INTO sfu_servers (server_id, endpoint, region, max_capacity, features, priority) VALUES
('sfu-us-east-1', 'wss://sfu-us-east-1.yourapp.com', 'us-east', 1000, '{"recording": true, "transcription": true, "ai_features": true}', 8),
('sfu-us-west-1', 'wss://sfu-us-west-1.yourapp.com', 'us-west', 1000, '{"recording": true, "transcription": true, "ai_features": true}', 8),
('sfu-eu-west-1', 'wss://sfu-eu-west-1.yourapp.com', 'eu-west', 800, '{"recording": true, "transcription": false, "ai_features": false}', 7),
('sfu-asia-1', 'wss://sfu-asia-1.yourapp.com', 'asia-pacific', 600, '{"recording": true, "transcription": false, "ai_features": false}', 6)
ON CONFLICT (server_id) DO NOTHING;