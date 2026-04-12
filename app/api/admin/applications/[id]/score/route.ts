import { createClient } from "@/lib/supabase/server"
import { isAdminRequest } from "@/lib/admin"
import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "")

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { isAdmin, userId } = await isAdminRequest(req)

  if (!isAdmin) {
    return Response.json({ error: "Unauthorized" }, { status: 403 })
  }

  const supabase = await createClient()

  // Get the application with job and user details
  const { data: application } = await supabase
    .from("applications")
    .select(
      `*, job_listings (title, company, domain, description, requirements), user_profiles:user_id (name, email, skills, experience, education)`
    )
    .eq("id", id)
    .single()

  if (!application) {
    return Response.json({ error: "Application not found" }, { status: 404 })
  }

  // Get interview messages
  const { data: messages } = await supabase
    .from("interview_messages")
    .select("*")
    .eq("application_id", id)
    .order("created_at", { ascending: true })

  const job = application.job_listings as any
  const user = application.user_profiles as any

  // Calculate resume score
  let resumeScore = 0
  try {
    resumeScore = await calculateResumeScore(job, user, application.credentials)
  } catch (err) {
    console.error("Resume score calculation failed:", err)
    resumeScore = calculateFallbackResumeScore(job, user)
  }

  // Calculate interview score
  let interviewScore = 0
  if (messages && messages.length > 0) {
    try {
      interviewScore = await calculateInterviewScore(job, messages)
    } catch (err) {
      console.error("Interview score calculation failed:", err)
      interviewScore = calculateFallbackInterviewScore(messages)
    }
  }

  // Update application with scores
  const { error } = await supabase
    .from("applications")
    .update({
      resume_score: resumeScore,
      interview_score: interviewScore,
      reviewed_by: userId,
    })
    .eq("id", id)

  if (error) {
    return Response.json({ error: "Failed to update scores" }, { status: 500 })
  }

  return Response.json({
    resume_score: resumeScore,
    interview_score: interviewScore,
  })
}

async function calculateResumeScore(
  job: any,
  user: any,
  credentials: string
): Promise<number> {
  const prompt = `You are an expert recruiter AI. Analyze how well this candidate's profile matches the job requirements. Return ONLY a JSON object with a "score" field (integer 0-100) and a "reasoning" field (one sentence).

Job: ${job.title} at ${job.company}
Domain: ${job.domain}
Description: ${job.description}
Requirements: ${(job.requirements || []).join(", ")}

Candidate Profile:
- Name: ${user?.name || "Unknown"}
- Skills: ${(user?.skills || []).join(", ") || "Not provided"}
- Experience: ${user?.experience || "Not provided"}
- Education: ${user?.education || "Not provided"}
- Credentials/Resume: ${credentials || "Not provided"}

Return ONLY valid JSON like: {"score": 75, "reasoning": "..."}`

  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 200 },
  })

  const text = result.response.text()
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    const parsed = JSON.parse(jsonMatch[0])
    return Math.min(100, Math.max(0, Math.round(parsed.score)))
  }
  return 50
}

async function calculateInterviewScore(
  job: any,
  messages: any[]
): Promise<number> {
  const transcript = messages
    .map((m) => `${m.role === "user" ? "Candidate" : "Interviewer"}: ${m.content}`)
    .join("\n")

  const prompt = `You are an expert recruiter AI. Analyze this interview transcript and score the candidate's performance. Return ONLY a JSON object with a "score" field (integer 0-100) and a "reasoning" field (one sentence).

Scoring criteria:
- Technical knowledge relevance to the position (0-30 points)
- Communication clarity and professionalism (0-25 points)
- Problem-solving approach (0-25 points)
- Enthusiasm and cultural fit (0-20 points)

Job: ${job.title} at ${job.company}
Requirements: ${(job.requirements || []).join(", ")}

Interview Transcript:
${transcript}

Return ONLY valid JSON like: {"score": 72, "reasoning": "..."}`

  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 200 },
  })

  const text = result.response.text()
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    const parsed = JSON.parse(jsonMatch[0])
    return Math.min(100, Math.max(0, Math.round(parsed.score)))
  }
  return 50
}

function calculateFallbackResumeScore(job: any, user: any): number {
  if (!user || !job) return 30

  let score = 30 // base score for having a profile
  const jobReqs = (job.requirements || []).map((r: string) => r.toLowerCase())
  const userSkills = (user.skills || []).map((s: string) => s.toLowerCase())

  // Check skill matches
  const matchCount = jobReqs.filter((req: string) =>
    userSkills.some((skill: string) => skill.includes(req) || req.includes(skill))
  ).length

  if (jobReqs.length > 0) {
    score += Math.round((matchCount / jobReqs.length) * 50)
  }

  if (user.experience) score += 10
  if (user.education) score += 10

  return Math.min(100, score)
}

function calculateFallbackInterviewScore(messages: any[]): number {
  const userMessages = messages.filter((m) => m.role === "user")
  if (userMessages.length === 0) return 0

  let score = 20 // base for participating
  
  // More messages = more engagement
  score += Math.min(30, userMessages.length * 6)

  // Longer responses = more detailed
  const avgLength = userMessages.reduce((sum, m) => sum + m.content.length, 0) / userMessages.length
  if (avgLength > 100) score += 20
  else if (avgLength > 50) score += 10

  return Math.min(100, score)
}
