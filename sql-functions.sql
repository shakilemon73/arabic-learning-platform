-- Custom SQL functions for the Arabic Learning Platform

-- Function to update class participant count
CREATE OR REPLACE FUNCTION update_class_participants(class_id UUID, increment_count BOOLEAN DEFAULT true)
RETURNS INTEGER AS $$
DECLARE
    new_count INTEGER;
BEGIN
    UPDATE live_classes 
    SET current_participants = CASE 
        WHEN increment_count THEN current_participants + 1
        ELSE GREATEST(current_participants - 1, 0)
    END
    WHERE id = class_id
    RETURNING current_participants INTO new_count;
    
    RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment classes attended for a user
CREATE OR REPLACE FUNCTION increment_classes_attended(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    new_count INTEGER;
BEGIN
    UPDATE users 
    SET classes_attended = classes_attended + 1,
        updated_at = NOW()
    WHERE id = user_id
    RETURNING classes_attended INTO new_count;
    
    RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate user progress based on attendance
CREATE OR REPLACE FUNCTION calculate_user_progress(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    total_classes INTEGER;
    attended_classes INTEGER;
    progress_percentage INTEGER;
BEGIN
    -- Get total number of active classes
    SELECT COUNT(*) INTO total_classes 
    FROM live_classes 
    WHERE is_active = true;
    
    -- Get user's attended classes
    SELECT COUNT(*) INTO attended_classes
    FROM class_attendance
    WHERE user_id = calculate_user_progress.user_id;
    
    -- Calculate percentage
    IF total_classes > 0 THEN
        progress_percentage := (attended_classes * 100) / total_classes;
    ELSE
        progress_percentage := 0;
    END IF;
    
    -- Update user's progress
    UPDATE users 
    SET course_progress = progress_percentage,
        updated_at = NOW()
    WHERE id = user_id;
    
    RETURN progress_percentage;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user dashboard stats
CREATE OR REPLACE FUNCTION get_user_dashboard_stats(user_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'course_progress', u.course_progress,
        'classes_attended', u.classes_attended,
        'enrollment_status', u.enrollment_status,
        'payment_status', u.payment_status,
        'certificate_score', u.certificate_score,
        'total_homework', (
            SELECT COUNT(*) 
            FROM homework_submissions 
            WHERE user_id = get_user_dashboard_stats.user_id
        ),
        'graded_homework', (
            SELECT COUNT(*) 
            FROM homework_submissions 
            WHERE user_id = get_user_dashboard_stats.user_id 
            AND status = 'graded'
        ),
        'upcoming_classes', (
            SELECT COUNT(*) 
            FROM live_classes 
            WHERE scheduled_at > NOW() 
            AND is_active = true
        )
    ) INTO result
    FROM users u
    WHERE u.id = user_id;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to enroll user in course (after payment confirmation)
CREATE OR REPLACE FUNCTION enroll_user_in_course(user_id UUID, payment_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    payment_confirmed BOOLEAN;
BEGIN
    -- Check if payment is confirmed
    SELECT (status = 'paid') INTO payment_confirmed
    FROM payment_records
    WHERE id = payment_id AND user_id = enroll_user_in_course.user_id;
    
    IF payment_confirmed THEN
        -- Update user enrollment status
        UPDATE users
        SET enrollment_status = 'enrolled',
            payment_status = 'paid',
            updated_at = NOW()
        WHERE id = user_id;
        
        RETURN true;
    ELSE
        RETURN false;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update user progress when attendance is recorded
CREATE OR REPLACE FUNCTION trigger_update_progress()
RETURNS TRIGGER AS $$
BEGIN
    -- Update classes attended count
    PERFORM increment_classes_attended(NEW.user_id);
    
    -- Recalculate progress
    PERFORM calculate_user_progress(NEW.user_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_attendance_insert
    AFTER INSERT ON class_attendance
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_progress();