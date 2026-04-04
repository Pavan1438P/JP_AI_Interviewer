-- Haveloc AI Interview Platform Database Schema
-- Run this in your Supabase SQL Editor

-- ============================================
-- CLEAN RESET - Drop all tables if they exist
-- ============================================
DROP TABLE IF EXISTS interview_messages CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS interested_jobs CASCADE;
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS job_listings CASCADE;

-- ============================================
-- TABLES
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Job Listings Table
CREATE TABLE IF NOT EXISTS job_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  domain TEXT NOT NULL,
  requirements TEXT[] DEFAULT '{}',
  location TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Profiles Table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  phone TEXT,
  skills TEXT[] DEFAULT '{}',
  experience TEXT,
  education TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Applications Table
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES job_listings(id) ON DELETE CASCADE,
  resume_url TEXT,
  credentials TEXT,
  scheduled_date DATE,
  scheduled_time TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Interested Jobs Table (saved/bookmarked jobs)
CREATE TABLE IF NOT EXISTS interested_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES job_listings(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, job_id)
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Interview Messages Table (for storing interview transcripts)
CREATE TABLE IF NOT EXISTS interview_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_interested_jobs_user_id ON interested_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_job_listings_domain ON job_listings(domain);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE job_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE interested_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running this script)
DROP POLICY IF EXISTS "Job listings are viewable by everyone" ON job_listings;

DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

DROP POLICY IF EXISTS "Users can view own applications" ON applications;
DROP POLICY IF EXISTS "Users can create own applications" ON applications;
DROP POLICY IF EXISTS "Users can update own applications" ON applications;
DROP POLICY IF EXISTS "Users can delete own applications" ON applications;

DROP POLICY IF EXISTS "Users can view own interested jobs" ON interested_jobs;
DROP POLICY IF EXISTS "Users can create own interested jobs" ON interested_jobs;
DROP POLICY IF EXISTS "Users can delete own interested jobs" ON interested_jobs;

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;

DROP POLICY IF EXISTS "Users can view own interview messages" ON interview_messages;
DROP POLICY IF EXISTS "Users can create own interview messages" ON interview_messages;

-- Job listings are readable by everyone, but only admins can modify
CREATE POLICY "Job listings are viewable by everyone" 
  ON job_listings FOR SELECT USING (true);

-- User profiles - users can only see and modify their own
CREATE POLICY "Users can view own profile" 
  ON user_profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON user_profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Applications - users can only see and modify their own
CREATE POLICY "Users can view own applications" 
  ON applications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own applications" 
  ON applications FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own applications" 
  ON applications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own applications" 
  ON applications FOR DELETE USING (auth.uid() = user_id);

-- Interested jobs - users can only see and modify their own
CREATE POLICY "Users can view own interested jobs" 
  ON interested_jobs FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own interested jobs" 
  ON interested_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own interested jobs" 
  ON interested_jobs FOR DELETE USING (auth.uid() = user_id);

-- Notifications - users can only see and modify their own
CREATE POLICY "Users can view own notifications" 
  ON notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" 
  ON notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications" 
  ON notifications FOR DELETE USING (auth.uid() = user_id);

-- Interview messages - users can only see their own application messages
CREATE POLICY "Users can view own interview messages" 
  ON interview_messages FOR SELECT 
  USING (auth.uid() IN (SELECT user_id FROM applications WHERE id = application_id));

CREATE POLICY "Users can create own interview messages" 
  ON interview_messages FOR INSERT 
  WITH CHECK (auth.uid() IN (SELECT user_id FROM applications WHERE id = application_id));

-- Functions for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_job_listings_updated_at 
  BEFORE UPDATE ON job_listings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at 
  BEFORE UPDATE ON applications 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed data for job listings (with explicit UUIDs to match frontend)
INSERT INTO job_listings (id, company, title, description, domain, requirements, location, type) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'TechCorp Solutions', 'Frontend Developer', 'We are looking for a skilled Frontend Developer to join our team. You will be responsible for building user interfaces using React and modern JavaScript frameworks.', 'Technology', ARRAY['React', 'TypeScript', 'CSS/Tailwind', 'Git', 'REST APIs'], 'Remote', 'Full-time'),
  ('550e8400-e29b-41d4-a716-446655440002', 'DataMind Analytics', 'Data Science Intern', 'Join our data science team as an intern. You will work on real-world machine learning projects and gain hands-on experience with Python and data analysis tools.', 'Data Science', ARRAY['Python', 'Machine Learning', 'SQL', 'Statistics', 'Pandas'], 'New York, NY', 'Internship'),
  ('550e8400-e29b-41d4-a716-446655440003', 'CloudNet Systems', 'Backend Engineer', 'We need a Backend Engineer to design and implement scalable server-side applications. Experience with Node.js and cloud services is essential.', 'Technology', ARRAY['Node.js', 'Express', 'PostgreSQL', 'AWS', 'Docker'], 'San Francisco, CA', 'Full-time'),
  ('550e8400-e29b-41d4-a716-446655440004', 'FinanceHub Inc', 'Financial Analyst Intern', 'Looking for a Finance Intern to assist with financial modeling, market research, and investment analysis. Great opportunity for finance students.', 'Finance', ARRAY['Excel', 'Financial Modeling', 'Accounting', 'Communication'], 'Chicago, IL', 'Internship'),
  ('550e8400-e29b-41d4-a716-446655440005', 'HealthTech Innovations', 'Full Stack Developer', 'Join our healthcare technology team to build applications that improve patient care. You will work across the entire stack using modern technologies.', 'Healthcare', ARRAY['React', 'Node.js', 'MongoDB', 'GraphQL', 'TypeScript'], 'Boston, MA', 'Full-time'),
  ('550e8400-e29b-41d4-a716-446655440006', 'MarketingPro Agency', 'Digital Marketing Intern', 'We are seeking a creative Digital Marketing Intern to help with social media management, content creation, and campaign analysis.', 'Marketing', ARRAY['Social Media', 'Content Writing', 'SEO', 'Google Analytics'], 'Remote', 'Internship'),
  ('550e8400-e29b-41d4-a716-446655440007', 'AI Research Labs', 'Machine Learning Engineer', 'Work on cutting-edge AI research and development. You will implement and deploy machine learning models for various applications.', 'Data Science', ARRAY['Python', 'TensorFlow/PyTorch', 'Deep Learning', 'MLOps', 'Mathematics'], 'Seattle, WA', 'Full-time'),
  ('550e8400-e29b-41d4-a716-446655440008', 'GreenEnergy Corp', 'Sustainability Consultant Intern', 'Help businesses transition to sustainable practices. You will conduct environmental assessments and develop green strategies.', 'Environment', ARRAY['Environmental Science', 'Research', 'Report Writing', 'Data Analysis'], 'Austin, TX', 'Internship');
