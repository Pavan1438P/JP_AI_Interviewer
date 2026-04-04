-- QUICK FIX: Update job IDs to match frontend
-- Run this in Supabase SQL Editor

-- Clear existing dependent data first
TRUNCATE TABLE interested_jobs, applications, notifications CASCADE;

-- Delete existing jobs and re-insert with correct UUIDs
DELETE FROM job_listings;

INSERT INTO job_listings (id, company, title, description, domain, requirements, location, type) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'TechCorp Solutions', 'Frontend Developer', 'We are looking for a skilled Frontend Developer to join our team. You will be responsible for building user interfaces using React and modern JavaScript frameworks.', 'Technology', ARRAY['React', 'TypeScript', 'CSS/Tailwind', 'Git', 'REST APIs'], 'Remote', 'Full-time'),
  ('550e8400-e29b-41d4-a716-446655440002', 'DataMind Analytics', 'Data Science Intern', 'Join our data science team as an intern. You will work on real-world machine learning projects and gain hands-on experience with Python and data analysis tools.', 'Data Science', ARRAY['Python', 'Machine Learning', 'SQL', 'Statistics', 'Pandas'], 'New York, NY', 'Internship'),
  ('550e8400-e29b-41d4-a716-446655440003', 'CloudNet Systems', 'Backend Engineer', 'We need a Backend Engineer to design and implement scalable server-side applications. Experience with Node.js and cloud services is essential.', 'Technology', ARRAY['Node.js', 'Express', 'PostgreSQL', 'AWS', 'Docker'], 'San Francisco, CA', 'Full-time'),
  ('550e8400-e29b-41d4-a716-446655440004', 'FinanceHub Inc', 'Financial Analyst Intern', 'Looking for a Finance Intern to assist with financial modeling, market research, and investment analysis. Great opportunity for finance students.', 'Finance', ARRAY['Excel', 'Financial Modeling', 'Accounting', 'Communication'], 'Chicago, IL', 'Internship'),
  ('550e8400-e29b-41d4-a716-446655440005', 'HealthTech Innovations', 'Full Stack Developer', 'Join our healthcare technology team to build applications that improve patient care. You will work across the entire stack using modern technologies.', 'Healthcare', ARRAY['React', 'Node.js', 'MongoDB', 'GraphQL', 'TypeScript'], 'Boston, MA', 'Full-time'),
  ('550e8400-e29b-41d4-a716-446655440006', 'MarketingPro Agency', 'Digital Marketing Intern', 'We are seeking a creative Digital Marketing Intern to help with social media management, content creation, and campaign analysis.', 'Marketing', ARRAY['Social Media', 'Content Writing', 'SEO', 'Google Analytics'], 'Remote', 'Internship'),
  ('550e8400-e29b-41d4-a716-446655440007', 'AI Research Labs', 'Machine Learning Engineer', 'Work on cutting-edge AI research and development. You will implement and deploy machine learning models for various applications.', 'Data Science', ARRAY['Python', 'TensorFlow/PyTorch', 'Deep Learning', 'MLOps', 'Mathematics'], 'Seattle, WA', 'Full-time'),
  ('550e8400-e29b-41d4-a716-446655440008', 'GreenEnergy Corp', 'Sustainability Consultant Intern', 'Help businesses transition to sustainable practices. You will conduct environmental assessments and develop green strategies.', 'Environment', ARRAY['Environmental Science', 'Research', 'Report Writing', 'Data Analysis'], 'Austin, TX', 'Internship');
