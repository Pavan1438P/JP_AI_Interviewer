-- Seed sample jobs for the Haveloc platform

INSERT INTO public.jobs (company, title, description, requirements, location, type, domain, salary_range) VALUES
-- Technology jobs
('TechCorp', 'Senior Software Engineer', 'We are looking for a senior software engineer to join our team and help build scalable web applications. You will work on cutting-edge technologies and collaborate with cross-functional teams.', ARRAY['5+ years experience', 'React/Node.js', 'System Design', 'Team Leadership'], 'San Francisco, CA', 'Full-time', 'Technology', '$150,000 - $200,000'),

('CloudScale', 'DevOps Engineer', 'Join our infrastructure team to design and maintain cloud-native systems. You will work with AWS, Kubernetes, and implement CI/CD pipelines.', ARRAY['AWS/GCP experience', 'Kubernetes', 'CI/CD pipelines', 'Infrastructure as Code'], 'Remote', 'Full-time', 'Technology', '$130,000 - $170,000'),

('StartupAI', 'Full Stack Developer Intern', 'Great opportunity for students to gain hands-on experience in web development. Work alongside senior engineers on real projects.', ARRAY['Currently enrolled student', 'JavaScript basics', 'Eager to learn', 'Good communication'], 'New York, NY', 'Internship', 'Technology', '$25/hour'),

-- Data Science jobs
('DataMinds', 'Machine Learning Engineer', 'Build and deploy machine learning models at scale. Work on NLP, computer vision, and recommendation systems.', ARRAY['Python/PyTorch', 'ML fundamentals', 'MLOps', '3+ years experience'], 'Seattle, WA', 'Full-time', 'Data Science', '$160,000 - $210,000'),

('AnalyticsPro', 'Data Analyst', 'Transform data into actionable insights. Create dashboards, perform statistical analysis, and present findings to stakeholders.', ARRAY['SQL proficiency', 'Python/R', 'Data visualization', 'Statistical analysis'], 'Chicago, IL', 'Full-time', 'Data Science', '$80,000 - $110,000'),

('ResearchLab', 'Data Science Intern', 'Research internship focused on applying ML techniques to solve real-world problems in healthcare and logistics.', ARRAY['Statistics background', 'Python', 'Research mindset', 'Graduate student preferred'], 'Boston, MA', 'Internship', 'Data Science', '$30/hour'),

-- Finance jobs
('GlobalBank', 'Financial Analyst', 'Analyze financial data, create financial models, and support strategic decision-making for corporate clients.', ARRAY['Financial modeling', 'Excel advanced', 'CFA preferred', '2+ years experience'], 'New York, NY', 'Full-time', 'Finance', '$90,000 - $130,000'),

('InvestCo', 'Quantitative Analyst', 'Develop quantitative models for trading strategies. Work with large datasets and implement algorithmic solutions.', ARRAY['PhD in Math/Physics/CS', 'Python/C++', 'Statistical modeling', 'Financial markets knowledge'], 'Chicago, IL', 'Full-time', 'Finance', '$180,000 - $250,000'),

('WealthAdvisors', 'Finance Intern', 'Support the wealth management team with research, client reporting, and financial analysis tasks.', ARRAY['Finance/Economics major', 'Excel proficiency', 'Attention to detail', 'Strong communication'], 'Miami, FL', 'Internship', 'Finance', '$22/hour'),

-- Healthcare jobs
('HealthTech', 'Healthcare Data Scientist', 'Apply data science to improve patient outcomes. Work with electronic health records and develop predictive models.', ARRAY['Healthcare domain knowledge', 'Python/R', 'HIPAA compliance', 'ML experience'], 'Boston, MA', 'Full-time', 'Healthcare', '$140,000 - $180,000'),

('MedDevice', 'Biomedical Engineer', 'Design and develop medical devices. Work with regulatory requirements and ensure product safety.', ARRAY['Biomedical engineering degree', 'FDA regulations', 'CAD software', '3+ years experience'], 'Minneapolis, MN', 'Full-time', 'Healthcare', '$100,000 - $140,000'),

('CareClinic', 'Healthcare Administration Intern', 'Learn healthcare operations and support administrative functions in a fast-paced clinical environment.', ARRAY['Healthcare admin major', 'Organizational skills', 'Patient-focused', 'MS Office'], 'Los Angeles, CA', 'Internship', 'Healthcare', '$20/hour'),

-- Marketing jobs
('BrandAgency', 'Digital Marketing Manager', 'Lead digital marketing campaigns across multiple channels. Manage paid advertising, SEO, and content strategy.', ARRAY['5+ years digital marketing', 'Google Ads certified', 'Analytics expertise', 'Team management'], 'Austin, TX', 'Full-time', 'Marketing', '$90,000 - $120,000'),

('SocialMedia Inc', 'Content Creator', 'Create engaging content for social media platforms. Work with influencers and develop viral campaigns.', ARRAY['Social media expertise', 'Video editing', 'Creative writing', 'Trend awareness'], 'Los Angeles, CA', 'Full-time', 'Marketing', '$60,000 - $80,000'),

('GrowthStartup', 'Marketing Intern', 'Support marketing initiatives including email campaigns, social media, and market research.', ARRAY['Marketing student', 'Social media savvy', 'Creative mindset', 'Writing skills'], 'Remote', 'Internship', 'Marketing', '$18/hour'),

-- Environment jobs
('GreenEnergy', 'Sustainability Consultant', 'Help organizations reduce their environmental impact. Conduct assessments and develop sustainability strategies.', ARRAY['Environmental science degree', 'Sustainability frameworks', 'Project management', 'Client communication'], 'Denver, CO', 'Full-time', 'Environment', '$80,000 - $110,000'),

('CleanTech', 'Environmental Engineer', 'Design systems for pollution control and waste management. Work on renewable energy projects.', ARRAY['Environmental engineering degree', 'EPA regulations', 'AutoCAD', '4+ years experience'], 'Portland, OR', 'Full-time', 'Environment', '$90,000 - $120,000'),

('EcoFoundation', 'Environmental Research Intern', 'Conduct research on climate change impacts and support conservation initiatives.', ARRAY['Environmental studies major', 'Research skills', 'Field work ability', 'Data collection'], 'Washington, DC', 'Internship', 'Environment', '$20/hour');
