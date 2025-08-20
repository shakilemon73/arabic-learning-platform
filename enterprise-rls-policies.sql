-- Enterprise Video SDK Row Level Security (RLS) Policies
-- Comprehensive security for production-grade video conferencing platform

-- Enable RLS on all enterprise tables
ALTER TABLE sfu_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE sfu_load_balancing_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE recording_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_quality_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_processing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_adaptations ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_class_participants_enterprise ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SFU INSTANCES POLICIES
-- =====================================================

-- SFU instances can be read by authenticated users
CREATE POLICY "sfu_instances_read" ON sfu_instances
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- SFU instances can be managed by service role or authenticated users
CREATE POLICY "sfu_instances_insert" ON sfu_instances
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "sfu_instances_update" ON sfu_instances
    FOR UPDATE
    USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- =====================================================
-- SFU LOAD BALANCING POLICIES
-- =====================================================

-- Load balancing requests can be read by authenticated users
CREATE POLICY "load_balancing_read" ON sfu_load_balancing_requests
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Load balancing can be managed by service role
CREATE POLICY "load_balancing_insert" ON sfu_load_balancing_requests
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "load_balancing_update" ON sfu_load_balancing_requests
    FOR UPDATE
    USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- =====================================================
-- RECORDING SESSIONS POLICIES
-- =====================================================

-- Users can read their own recording sessions or if they're participants
CREATE POLICY "recording_sessions_read" ON recording_sessions
    FOR SELECT
    USING (
        auth.role() = 'authenticated' AND (
            -- User is creator/host of the room
            room_id IN (
                SELECT room_id FROM live_classes WHERE instructor_id = auth.uid()::text
            )
            OR
            -- User is participant in the recording
            auth.uid()::text = ANY(participants)
            OR
            -- Service role can access all
            auth.role() = 'service_role'
        )
    );

-- Recording sessions can be created by authenticated users
CREATE POLICY "recording_sessions_insert" ON recording_sessions
    FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated' AND (
            -- User is instructor of the room
            room_id IN (
                SELECT room_id FROM live_classes WHERE instructor_id = auth.uid()::text
            )
            OR
            auth.role() = 'service_role'
        )
    );

-- Recording sessions can be updated by creators or service role
CREATE POLICY "recording_sessions_update" ON recording_sessions
    FOR UPDATE
    USING (
        auth.role() = 'authenticated' AND (
            room_id IN (
                SELECT room_id FROM live_classes WHERE instructor_id = auth.uid()::text
            )
            OR
            auth.role() = 'service_role'
        )
    );

-- =====================================================
-- NETWORK QUALITY METRICS POLICIES
-- =====================================================

-- Users can read network metrics for rooms they participate in
CREATE POLICY "network_metrics_read" ON network_quality_metrics
    FOR SELECT
    USING (
        auth.role() = 'authenticated' AND (
            -- User's own metrics
            participant_id = auth.uid()::text
            OR
            -- User is instructor of the room
            room_id IN (
                SELECT room_id FROM live_classes WHERE instructor_id = auth.uid()::text
            )
            OR
            -- Service role can access all
            auth.role() = 'service_role'
        )
    );

-- Network metrics can be inserted by participants or service
CREATE POLICY "network_metrics_insert" ON network_quality_metrics
    FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated' AND (
            participant_id = auth.uid()::text
            OR
            auth.role() = 'service_role'
        )
    );

-- =====================================================
-- AUDIO PROCESSING EVENTS POLICIES
-- =====================================================

-- Users can read audio events for their own participation
CREATE POLICY "audio_events_read" ON audio_processing_events
    FOR SELECT
    USING (
        auth.role() = 'authenticated' AND (
            participant_id = auth.uid()::text
            OR
            room_id IN (
                SELECT room_id FROM live_classes WHERE instructor_id = auth.uid()::text
            )
            OR
            auth.role() = 'service_role'
        )
    );

-- Audio events can be inserted by participants
CREATE POLICY "audio_events_insert" ON audio_processing_events
    FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated' AND (
            participant_id = auth.uid()::text
            OR
            auth.role() = 'service_role'
        )
    );

-- =====================================================
-- QUALITY ADAPTATIONS POLICIES
-- =====================================================

-- Users can read quality adaptations for their participation
CREATE POLICY "quality_adaptations_read" ON quality_adaptations
    FOR SELECT
    USING (
        auth.role() = 'authenticated' AND (
            participant_id = auth.uid()::text
            OR
            room_id IN (
                SELECT room_id FROM live_classes WHERE instructor_id = auth.uid()::text
            )
            OR
            auth.role() = 'service_role'
        )
    );

-- Quality adaptations can be inserted by participants or system
CREATE POLICY "quality_adaptations_insert" ON quality_adaptations
    FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated' AND (
            participant_id = auth.uid()::text
            OR
            auth.role() = 'service_role'
        )
    );

-- =====================================================
-- PERFORMANCE ALERTS POLICIES
-- =====================================================

-- Performance alerts can be read by authenticated users
CREATE POLICY "performance_alerts_read" ON performance_alerts
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Performance alerts can be created by system or authenticated users
CREATE POLICY "performance_alerts_insert" ON performance_alerts
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Performance alerts can be updated (resolved) by authenticated users
CREATE POLICY "performance_alerts_update" ON performance_alerts
    FOR UPDATE
    USING (auth.role() = 'authenticated');

-- =====================================================
-- LIVE CLASS PARTICIPANTS ENTERPRISE POLICIES
-- =====================================================

-- Users can read participants in rooms they're part of
CREATE POLICY "participants_enterprise_read" ON live_class_participants_enterprise
    FOR SELECT
    USING (
        auth.role() = 'authenticated' AND (
            -- User is the participant themselves
            user_id = auth.uid()::text
            OR
            -- User is in the same room
            room_id IN (
                SELECT room_id FROM live_class_participants_enterprise 
                WHERE user_id = auth.uid()::text
            )
            OR
            -- User is instructor of the room
            room_id IN (
                SELECT room_id FROM live_classes WHERE instructor_id = auth.uid()::text
            )
            OR
            auth.role() = 'service_role'
        )
    );

-- Users can insert themselves as participants
CREATE POLICY "participants_enterprise_insert" ON live_class_participants_enterprise
    FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated' AND (
            user_id = auth.uid()::text
            OR
            auth.role() = 'service_role'
        )
    );

-- Users can update their own participation data
CREATE POLICY "participants_enterprise_update" ON live_class_participants_enterprise
    FOR UPDATE
    USING (
        auth.role() = 'authenticated' AND (
            user_id = auth.uid()::text
            OR
            room_id IN (
                SELECT room_id FROM live_classes WHERE instructor_id = auth.uid()::text
            )
            OR
            auth.role() = 'service_role'
        )
    );

-- Users can delete their own participation
CREATE POLICY "participants_enterprise_delete" ON live_class_participants_enterprise
    FOR DELETE
    USING (
        auth.role() = 'authenticated' AND (
            user_id = auth.uid()::text
            OR
            room_id IN (
                SELECT room_id FROM live_classes WHERE instructor_id = auth.uid()::text
            )
            OR
            auth.role() = 'service_role'
        )
    );

-- =====================================================
-- ADDITIONAL SECURITY FUNCTIONS
-- =====================================================

-- Function to check if user is room instructor
CREATE OR REPLACE FUNCTION is_room_instructor(room_id_param text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM live_classes 
        WHERE room_id = room_id_param 
        AND instructor_id = auth.uid()::text
    );
END;
$$;

-- Function to check if user is room participant
CREATE OR REPLACE FUNCTION is_room_participant(room_id_param text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM live_class_participants_enterprise 
        WHERE room_id = room_id_param 
        AND user_id = auth.uid()::text
        AND left_at IS NULL
    );
END;
$$;

-- =====================================================
-- INDEXES FOR RLS PERFORMANCE
-- =====================================================

-- Add indexes to optimize RLS policy queries
CREATE INDEX IF NOT EXISTS idx_recording_sessions_participants ON recording_sessions USING GIN(participants);
CREATE INDEX IF NOT EXISTS idx_live_classes_instructor ON live_classes(instructor_id);
CREATE INDEX IF NOT EXISTS idx_live_classes_room_id ON live_classes(room_id);
CREATE INDEX IF NOT EXISTS idx_participants_enterprise_user_room ON live_class_participants_enterprise(user_id, room_id);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated, anon;

-- Grant permissions on tables
GRANT SELECT ON sfu_instances TO authenticated, anon;
GRANT INSERT, UPDATE ON sfu_instances TO authenticated;

GRANT SELECT ON sfu_load_balancing_requests TO authenticated, anon;
GRANT INSERT, UPDATE ON sfu_load_balancing_requests TO authenticated;

GRANT SELECT ON recording_sessions TO authenticated, anon;
GRANT INSERT, UPDATE ON recording_sessions TO authenticated;

GRANT SELECT ON network_quality_metrics TO authenticated, anon;
GRANT INSERT ON network_quality_metrics TO authenticated;

GRANT SELECT ON audio_processing_events TO authenticated, anon;
GRANT INSERT ON audio_processing_events TO authenticated;

GRANT SELECT ON quality_adaptations TO authenticated, anon;
GRANT INSERT ON quality_adaptations TO authenticated;

GRANT SELECT ON performance_alerts TO authenticated, anon;
GRANT INSERT, UPDATE ON performance_alerts TO authenticated;

GRANT ALL ON live_class_participants_enterprise TO authenticated;
GRANT SELECT ON live_class_participants_enterprise TO anon;

-- Grant permissions on views
GRANT SELECT ON sfu_performance_summary TO authenticated, anon;
GRANT SELECT ON recording_statistics TO authenticated, anon;
GRANT SELECT ON network_quality_summary TO authenticated, anon;
GRANT SELECT ON active_room_performance TO authenticated, anon;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- REALTIME SUBSCRIPTIONS
-- =====================================================

-- Enable realtime for enterprise tables
ALTER PUBLICATION supabase_realtime ADD TABLE sfu_instances;
ALTER PUBLICATION supabase_realtime ADD TABLE recording_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE network_quality_metrics;
ALTER PUBLICATION supabase_realtime ADD TABLE audio_processing_events;
ALTER PUBLICATION supabase_realtime ADD TABLE quality_adaptations;
ALTER PUBLICATION supabase_realtime ADD TABLE performance_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE live_class_participants_enterprise;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON POLICY "sfu_instances_read" ON sfu_instances IS 
'Allows authenticated users to read SFU instance information for load balancing and monitoring';

COMMENT ON POLICY "recording_sessions_read" ON recording_sessions IS 
'Users can access recordings from rooms where they are instructor or participant';

COMMENT ON POLICY "network_metrics_read" ON network_quality_metrics IS 
'Users can view network metrics for rooms they participate in or instruct';

COMMENT ON POLICY "participants_enterprise_read" ON live_class_participants_enterprise IS 
'Users can see participants in rooms they are part of or instruct';

COMMENT ON FUNCTION is_room_instructor(text) IS 
'Helper function to check if current user is instructor of specified room';

COMMENT ON FUNCTION is_room_participant(text) IS 
'Helper function to check if current user is participant in specified room';