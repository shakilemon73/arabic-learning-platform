-- ENTERPRISE VIDEO SDK SUPABASE SETUP
-- Complete database schema with RLS policies for production-grade video conferencing

-- =====================================================
-- STEP 1: CREATE ENTERPRISE TABLES
-- =====================================================

-- SFU (Selective Forwarding Unit) Management
CREATE TABLE IF NOT EXISTS sfu_instances (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    region TEXT NOT NULL CHECK (region IN ('us-east', 'us-west', 'eu-west', 'asia-pacific')),
    max_participants INTEGER DEFAULT 100,
    current_participants INTEGER DEFAULT 0,
    cpu_usage REAL DEFAULT 0,
    memory_usage REAL DEFAULT 0,
    total_bandwidth BIGINT DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- SFU Load Balancing Requests
CREATE TABLE IF NOT EXISTS sfu_load_balancing_requests (
    id SERIAL PRIMARY KEY,
    source_sfu TEXT NOT NULL,
    target_sfu TEXT NOT NULL,
    participants_to_migrate INTEGER NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Enhanced Recording Sessions
CREATE TABLE IF NOT EXISTS recording_sessions (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    duration INTEGER DEFAULT 0,
    size BIGINT DEFAULT 0,
    participants TEXT[] DEFAULT '{}',
    config JSONB NOT NULL DEFAULT '{}',
    status TEXT DEFAULT 'starting' CHECK (status IN ('starting', 'recording', 'processing', 'completed', 'failed')),
    download_url TEXT,
    error TEXT,
    encrypted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Network Quality Metrics
CREATE TABLE IF NOT EXISTS network_quality_metrics (
    id SERIAL PRIMARY KEY,
    room_id TEXT NOT NULL,
    participant_id TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    latency_ms REAL,
    bandwidth_kbps REAL,
    packet_loss_percentage REAL,
    jitter_ms REAL,
    connection_type TEXT CHECK (connection_type IN ('wifi', 'cellular', 'ethernet', 'unknown')),
    quality_score TEXT CHECK (quality_score IN ('excellent', 'good', 'poor', 'critical')),
    network_path TEXT
);

-- Audio Processing Events
CREATE TABLE IF NOT EXISTS audio_processing_events (
    id SERIAL PRIMARY KEY,
    room_id TEXT NOT NULL,
    participant_id TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    event_type TEXT NOT NULL CHECK (event_type IN ('voice_activity', 'noise_suppression', 'echo_cancellation', 'quality_change')),
    confidence REAL,
    input_level REAL,
    output_level REAL,
    noise_level REAL,
    metadata JSONB DEFAULT '{}'
);

-- Quality Adaptation History
CREATE TABLE IF NOT EXISTS quality_adaptations (
    id SERIAL PRIMARY KEY,
    room_id TEXT NOT NULL,
    participant_id TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    previous_quality JSONB NOT NULL,
    new_quality JSONB NOT NULL,
    reason TEXT NOT NULL,
    network_conditions JSONB NOT NULL,
    adaptation_type TEXT CHECK (adaptation_type IN ('automatic', 'manual', 'emergency'))
);

-- Performance Alerts
CREATE TABLE IF NOT EXISTS performance_alerts (
    id SERIAL PRIMARY KEY,
    room_id TEXT NOT NULL,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('high_cpu', 'high_memory', 'high_latency', 'packet_loss', 'connection_failure')),
    severity TEXT NOT NULL CHECK (severity IN ('warning', 'critical')),
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Enhanced Live Class Participants with Enterprise Features
CREATE TABLE IF NOT EXISTS live_class_participants_enterprise (
    id SERIAL PRIMARY KEY,
    room_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('host', 'moderator', 'participant')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP WITH TIME ZONE,
    has_video BOOLEAN DEFAULT true,
    has_audio BOOLEAN DEFAULT true,
    is_screen_sharing BOOLEAN DEFAULT false,
    bandwidth_kbps REAL,
    device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
    browser_name TEXT,
    browser_version TEXT,
    connection_quality TEXT CHECK (connection_quality IN ('excellent', 'good', 'poor', 'critical')),
    avg_latency_ms REAL,
    total_packets_lost INTEGER DEFAULT 0,
    sfu_instance_id TEXT,
    adaptive_bitrate_enabled BOOLEAN DEFAULT true,
    audio_processing_enabled BOOLEAN DEFAULT true,
    network_resilience_enabled BOOLEAN DEFAULT true,
    UNIQUE(room_id, user_id)
);

-- =====================================================
-- STEP 2: CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_sfu_instances_room_region ON sfu_instances(room_id, region);
CREATE INDEX IF NOT EXISTS idx_sfu_instances_status ON sfu_instances(status);
CREATE INDEX IF NOT EXISTS idx_recording_sessions_room_status ON recording_sessions(room_id, status);
CREATE INDEX IF NOT EXISTS idx_recording_sessions_created_at ON recording_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_network_quality_timestamp ON network_quality_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_network_quality_room_participant ON network_quality_metrics(room_id, participant_id);
CREATE INDEX IF NOT EXISTS idx_audio_events_room_timestamp ON audio_processing_events(room_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_quality_adaptations_room_timestamp ON quality_adaptations(room_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_alerts_unresolved ON performance_alerts(resolved) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_participants_enterprise_room ON live_class_participants_enterprise(room_id);
CREATE INDEX IF NOT EXISTS idx_participants_enterprise_user ON live_class_participants_enterprise(user_id);

-- =====================================================
-- STEP 3: CREATE UPDATE TRIGGER FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_sfu_instances_updated_at 
    BEFORE UPDATE ON sfu_instances 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recording_sessions_updated_at 
    BEFORE UPDATE ON recording_sessions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STEP 4: CREATE ANALYTICS VIEWS
-- =====================================================

-- Real-time SFU Performance View
CREATE OR REPLACE VIEW sfu_performance_summary AS
SELECT 
    region,
    COUNT(*) as total_instances,
    COUNT(*) FILTER (WHERE status = 'active') as active_instances,
    AVG(cpu_usage) as avg_cpu_usage,
    AVG(memory_usage) as avg_memory_usage,
    SUM(current_participants) as total_participants,
    SUM(total_bandwidth) as total_bandwidth
FROM sfu_instances
GROUP BY region;

-- Recording Statistics View
CREATE OR REPLACE VIEW recording_statistics AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as total_recordings,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_recordings,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_recordings,
    AVG(duration) as avg_duration_seconds,
    SUM(size) as total_storage_bytes,
    AVG(size) FILTER (WHERE status = 'completed') as avg_file_size_bytes
FROM recording_sessions
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- Network Quality Summary View
CREATE OR REPLACE VIEW network_quality_summary AS
SELECT 
    room_id,
    participant_id,
    COUNT(*) as measurement_count,
    AVG(latency_ms) as avg_latency,
    AVG(bandwidth_kbps) as avg_bandwidth,
    AVG(packet_loss_percentage) as avg_packet_loss,
    AVG(jitter_ms) as avg_jitter,
    mode() WITHIN GROUP (ORDER BY quality_score) as most_common_quality,
    MIN(timestamp) as first_measurement,
    MAX(timestamp) as last_measurement
FROM network_quality_metrics
WHERE timestamp > CURRENT_TIMESTAMP - INTERVAL '1 hour'
GROUP BY room_id, participant_id;

-- Active Room Performance View
CREATE OR REPLACE VIEW active_room_performance AS
SELECT 
    r.room_id,
    COUNT(p.user_id) as participant_count,
    AVG(p.avg_latency_ms) as avg_room_latency,
    AVG(p.bandwidth_kbps) as avg_room_bandwidth,
    COUNT(*) FILTER (WHERE p.connection_quality = 'excellent') as excellent_connections,
    COUNT(*) FILTER (WHERE p.connection_quality = 'good') as good_connections,
    COUNT(*) FILTER (WHERE p.connection_quality = 'poor') as poor_connections,
    COUNT(*) FILTER (WHERE p.connection_quality = 'critical') as critical_connections,
    s.region as sfu_region,
    s.cpu_usage as sfu_cpu,
    s.memory_usage as sfu_memory
FROM (SELECT DISTINCT room_id FROM live_class_participants_enterprise WHERE left_at IS NULL) r
LEFT JOIN live_class_participants_enterprise p ON r.room_id = p.room_id AND p.left_at IS NULL
LEFT JOIN sfu_instances s ON r.room_id = s.room_id AND s.status = 'active'
GROUP BY r.room_id, s.region, s.cpu_usage, s.memory_usage;

-- =====================================================
-- STEP 5: ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE sfu_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE sfu_load_balancing_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE recording_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_quality_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_processing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_adaptations ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_class_participants_enterprise ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 6: CREATE RLS POLICIES
-- =====================================================

-- SFU Instances Policies
CREATE POLICY "sfu_instances_read" ON sfu_instances
    FOR SELECT USING (true); -- Allow read access for monitoring

CREATE POLICY "sfu_instances_write" ON sfu_instances
    FOR ALL USING (auth.role() = 'authenticated');

-- Recording Sessions Policies  
CREATE POLICY "recording_sessions_read" ON recording_sessions
    FOR SELECT USING (
        auth.role() = 'authenticated' AND (
            auth.uid()::text = ANY(participants) OR
            auth.role() = 'service_role'
        )
    );

CREATE POLICY "recording_sessions_write" ON recording_sessions
    FOR ALL USING (auth.role() = 'authenticated');

-- Network Quality Metrics Policies
CREATE POLICY "network_metrics_read" ON network_quality_metrics
    FOR SELECT USING (
        auth.role() = 'authenticated' AND (
            participant_id = auth.uid()::text OR
            auth.role() = 'service_role'
        )
    );

CREATE POLICY "network_metrics_write" ON network_quality_metrics
    FOR ALL USING (auth.role() = 'authenticated');

-- Audio Processing Events Policies
CREATE POLICY "audio_events_read" ON audio_processing_events
    FOR SELECT USING (
        auth.role() = 'authenticated' AND (
            participant_id = auth.uid()::text OR
            auth.role() = 'service_role'
        )
    );

CREATE POLICY "audio_events_write" ON audio_processing_events
    FOR ALL USING (auth.role() = 'authenticated');

-- Quality Adaptations Policies
CREATE POLICY "quality_adaptations_read" ON quality_adaptations
    FOR SELECT USING (
        auth.role() = 'authenticated' AND (
            participant_id = auth.uid()::text OR
            auth.role() = 'service_role'
        )
    );

CREATE POLICY "quality_adaptations_write" ON quality_adaptations
    FOR ALL USING (auth.role() = 'authenticated');

-- Performance Alerts Policies
CREATE POLICY "performance_alerts_read" ON performance_alerts
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "performance_alerts_write" ON performance_alerts
    FOR ALL USING (auth.role() = 'authenticated');

-- Participants Enterprise Policies
CREATE POLICY "participants_enterprise_read" ON live_class_participants_enterprise
    FOR SELECT USING (
        auth.role() = 'authenticated' AND (
            user_id = auth.uid()::text OR
            room_id IN (
                SELECT room_id FROM live_class_participants_enterprise 
                WHERE user_id = auth.uid()::text
            )
        )
    );

CREATE POLICY "participants_enterprise_write" ON live_class_participants_enterprise
    FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- STEP 7: GRANT PERMISSIONS
-- =====================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated, anon;

-- Grant permissions on tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant permissions on views
GRANT SELECT ON sfu_performance_summary TO authenticated, anon;
GRANT SELECT ON recording_statistics TO authenticated, anon;
GRANT SELECT ON network_quality_summary TO authenticated, anon;
GRANT SELECT ON active_room_performance TO authenticated, anon;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- STEP 8: ENABLE REALTIME SUBSCRIPTIONS
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE sfu_instances;
ALTER PUBLICATION supabase_realtime ADD TABLE recording_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE network_quality_metrics;
ALTER PUBLICATION supabase_realtime ADD TABLE audio_processing_events;
ALTER PUBLICATION supabase_realtime ADD TABLE quality_adaptations;
ALTER PUBLICATION supabase_realtime ADD TABLE performance_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE live_class_participants_enterprise;

-- =====================================================
-- STEP 9: INSERT SAMPLE DATA FOR TESTING
-- =====================================================

INSERT INTO sfu_instances (id, room_id, region, max_participants) VALUES 
('sfu_us_east_001', 'arabic-class-001', 'us-east', 100),
('sfu_us_west_001', 'arabic-class-002', 'us-west', 100),
('sfu_eu_west_001', 'arabic-class-003', 'eu-west', 100)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- COMPLETED: ENTERPRISE VIDEO SDK DATABASE READY
-- =====================================================