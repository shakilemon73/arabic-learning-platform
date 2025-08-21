-- Fix existing users who might not have profiles
-- Run this after creating the users table

-- Insert any missing user profiles for existing authenticated users
INSERT INTO users (id, email, first_name, last_name, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'first_name', split_part(au.email, '@', 1)),
    COALESCE(au.raw_user_meta_data->>'last_name', ''),
    au.created_at,
    NOW()
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE u.id IS NULL
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(users.first_name, EXCLUDED.first_name),
    last_name = COALESCE(users.last_name, EXCLUDED.last_name),
    updated_at = NOW();

-- Verify users table
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.enrollment_status,
    u.payment_status,
    u.created_at
FROM users u
ORDER BY u.created_at DESC;