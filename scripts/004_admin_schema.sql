-- Admin Panel Schema Migration
-- Run this in your Supabase SQL Editor AFTER the main schema

-- ============================================
-- DROP EXISTING POLICIES (safe to re-run)
-- ============================================
DROP POLICY IF EXISTS "Admins can insert job listings" ON job_listings;
DROP POLICY IF EXISTS "Admins can update job listings" ON job_listings;
DROP POLICY IF EXISTS "Admins can delete job listings" ON job_listings;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all applications" ON applications;
DROP POLICY IF EXISTS "Admins can update all applications" ON applications;
DROP POLICY IF EXISTS "Admins can view all interview messages" ON interview_messages;
DROP POLICY IF EXISTS "Admins can insert notifications" ON notifications;

-- ============================================
-- ADD ADMIN ROLE TO USER PROFILES
-- ============================================
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- ============================================
-- ADD SCORING & REVIEW COLUMNS TO APPLICATIONS
-- ============================================
ALTER TABLE applications ADD COLUMN IF NOT EXISTS resume_score INTEGER DEFAULT NULL CHECK (resume_score IS NULL OR (resume_score >= 0 AND resume_score <= 100));
ALTER TABLE applications ADD COLUMN IF NOT EXISTS interview_score INTEGER DEFAULT NULL CHECK (interview_score IS NULL OR (interview_score >= 0 AND interview_score <= 100));
ALTER TABLE applications ADD COLUMN IF NOT EXISTS video_url TEXT DEFAULT NULL;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS admin_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS admin_notes TEXT DEFAULT NULL;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS reviewed_by UUID DEFAULT NULL REFERENCES auth.users(id);

-- ============================================
-- ADMIN RLS POLICIES
-- ============================================

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin can view all job listings (already public, but admin can also INSERT/UPDATE/DELETE)
CREATE POLICY "Admins can insert job listings" 
  ON job_listings FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update job listings" 
  ON job_listings FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can delete job listings" 
  ON job_listings FOR DELETE USING (is_admin());

-- Admin can view all user profiles
CREATE POLICY "Admins can view all profiles" 
  ON user_profiles FOR SELECT USING (is_admin() OR auth.uid() = id);

-- Admin can view all applications
CREATE POLICY "Admins can view all applications" 
  ON applications FOR SELECT USING (is_admin());

-- Admin can update any application (for approval, scoring, notes)
CREATE POLICY "Admins can update all applications" 
  ON applications FOR UPDATE USING (is_admin());

-- Admin can view all interview messages (for reviewing transcripts)
CREATE POLICY "Admins can view all interview messages" 
  ON interview_messages FOR SELECT USING (is_admin());

-- Admin can insert notifications for any user (for approval notifications)
CREATE POLICY "Admins can insert notifications" 
  ON notifications FOR INSERT WITH CHECK (is_admin());

-- ============================================
-- CREATE INDEX FOR ADMIN QUERIES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_applications_admin_approved ON applications(admin_approved);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

-- ============================================
-- PROMOTE A USER TO ADMIN (Run manually)
-- ============================================
UPDATE user_profiles SET role = 'admin' WHERE email = 'jpk28072007@gmail.com';
