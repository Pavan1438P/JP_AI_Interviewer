import { JobListing } from "./store"
import { createClient } from "./supabase/client"

export const domains = [
  "All Domains",
  "Technology",
  "Data Science",
  "Finance",
  "Healthcare",
  "Marketing",
  "Environment",
]

// Fetch job listings from Supabase
export async function fetchJobListings(domain?: string): Promise<JobListing[]> {
  const supabase = createClient()
  let query = supabase.from("job_listings").select("*")

  if (domain && domain !== "All Domains") {
    query = query.eq("domain", domain)
  }

  const { data, error } = await query.order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching job listings:", error)
    return []
  }

  return (data || []).map((job: any) => ({
    id: job.id,
    company: job.company,
    title: job.title,
    description: job.description,
    domain: job.domain,
    requirements: job.requirements || [],
    location: job.location,
    type: job.type,
    created_at: job.created_at,
  }))
}

// Fallback static job listings (used if Supabase is not configured)
export const jobListings: JobListing[] = [
  {
    id: "550e8400-e29b-41d4-a716-446655440001",
    company: "TechCorp Solutions",
    title: "Frontend Developer",
    description: "We are looking for a skilled Frontend Developer to join our team. You will be responsible for building user interfaces using React and modern JavaScript frameworks.",
    domain: "Technology",
    requirements: ["React", "TypeScript", "CSS/Tailwind", "Git", "REST APIs"],
    location: "Remote",
    type: "Full-time",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440002",
    company: "DataMind Analytics",
    title: "Data Science Intern",
    description: "Join our data science team as an intern. You will work on real-world machine learning projects and gain hands-on experience with Python and data analysis tools.",
    domain: "Data Science",
    requirements: ["Python", "Machine Learning", "SQL", "Statistics", "Pandas"],
    location: "New York, NY",
    type: "Internship",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440003",
    company: "CloudNet Systems",
    title: "Backend Engineer",
    description: "We need a Backend Engineer to design and implement scalable server-side applications. Experience with Node.js and cloud services is essential.",
    domain: "Technology",
    requirements: ["Node.js", "Express", "PostgreSQL", "AWS", "Docker"],
    location: "San Francisco, CA",
    type: "Full-time",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440004",
    company: "FinanceHub Inc",
    title: "Financial Analyst Intern",
    description: "Looking for a Finance Intern to assist with financial modeling, market research, and investment analysis. Great opportunity for finance students.",
    domain: "Finance",
    requirements: ["Excel", "Financial Modeling", "Accounting", "Communication"],
    location: "Chicago, IL",
    type: "Internship",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440005",
    company: "HealthTech Innovations",
    title: "Full Stack Developer",
    description: "Join our healthcare technology team to build applications that improve patient care. You will work across the entire stack using modern technologies.",
    domain: "Healthcare",
    requirements: ["React", "Node.js", "MongoDB", "GraphQL", "TypeScript"],
    location: "Boston, MA",
    type: "Full-time",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440006",
    company: "MarketingPro Agency",
    title: "Digital Marketing Intern",
    description: "We are seeking a creative Digital Marketing Intern to help with social media management, content creation, and campaign analysis.",
    domain: "Marketing",
    requirements: ["Social Media", "Content Writing", "SEO", "Google Analytics"],
    location: "Remote",
    type: "Internship",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440007",
    company: "AI Research Labs",
    title: "Machine Learning Engineer",
    description: "Work on cutting-edge AI research and development. You will implement and deploy machine learning models for various applications.",
    domain: "Data Science",
    requirements: ["Python", "TensorFlow/PyTorch", "Deep Learning", "MLOps", "Mathematics"],
    location: "Seattle, WA",
    type: "Full-time",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440008",
    company: "GreenEnergy Corp",
    title: "Sustainability Consultant Intern",
    description: "Help businesses transition to sustainable practices. You will conduct environmental assessments and develop green strategies.",
    domain: "Environment",
    requirements: ["Environmental Science", "Research", "Report Writing", "Data Analysis"],
    location: "Austin, TX",
    type: "Internship",
  },
]
