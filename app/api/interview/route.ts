import { UIMessage } from "ai"
import { createClient } from "@/lib/supabase/server"
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit"
import { GoogleGenerativeAI } from "@google/generative-ai"

export const maxDuration = 60
export const dynamic = "force-dynamic"

// Maximum request body size (50KB)
const MAX_BODY_SIZE = 50 * 1024
const MAX_MESSAGES = 20

interface InterviewContext {
  jobTitle: string
  jobDescription: string
  jobRequirements: string[]
  company: string
  candidateCredentials: string
  candidateName: string
  candidateEmail: string
}

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "")

export async function POST(req: Request) {
  try {
    // Check request content-length to prevent large body attacks
    const contentLength = parseInt(req.headers.get("content-length") || "0")
    if (contentLength > MAX_BODY_SIZE) {
      return new Response(
        JSON.stringify({ error: "Request body too large" }),
        {
          status: 413,
          headers: {
            "Content-Type": "application/json",
          },
        }
      )
    }

    // Get client IP for rate limiting
    const forwardedFor = req.headers.get("x-forwarded-for")
    const realIp = req.headers.get("x-real-ip")
    const ip = forwardedFor?.split(",")[0]?.trim() || realIp || "anonymous"

    // Check rate limit (10 requests per minute per IP - more strict for interviews)
    const rateLimitResult = await checkRateLimit(`interview:${ip}`, {
      maxRequests: 10,
      windowMs: 60000,
    })

    const rateLimitHeaders = getRateLimitHeaders(
      rateLimitResult.allowed,
      rateLimitResult.remaining,
      rateLimitResult.resetTime,
      10
    )

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            ...rateLimitHeaders,
          },
        }
      )
    }

    // Authenticate user
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized. Please sign in." }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            ...rateLimitHeaders,
          },
        }
      )
    }

    // Parse and validate request body
    let body
    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...rateLimitHeaders,
          },
        }
      )
    }

    const { messages } = body as { messages: UIMessage[] }

    // Validate messages array
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
      return new Response(
        JSON.stringify({ error: "Invalid messages array. Must have 1-20 messages." }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...rateLimitHeaders,
          },
        }
      )
    }

    // Get interview context from request headers
    const contextHeader = req.headers.get("x-interview-context")
    console.log("Context header received:", contextHeader ? "yes" : "no")
    
    let context: InterviewContext
    
    if (contextHeader && contextHeader !== "") {
      try {
        context = JSON.parse(contextHeader)
        console.log("Parsed context:", context.candidateName, "@", context.company)
      } catch (e) {
        console.error("Failed to parse context header:", e)
        context = getDefaultContext()
      }
    } else {
      console.log("No context header, using defaults")
      context = getDefaultContext()
    }

    // Check which API keys are available and valid
    const anthropicKey = process.env.ANTHROPIC_API_KEY
    const geminiKey = process.env.GOOGLE_API_KEY
    
    const hasAnthropicKey = anthropicKey && anthropicKey.trim() !== "" && 
                           anthropicKey !== "your_anthropic_api_key_here" && 
                           anthropicKey.startsWith("sk-ant-api03-")
    const hasGeminiKey = geminiKey && geminiKey.trim() !== "" && 
                        geminiKey !== "your_google_api_key_here" && 
                        geminiKey.startsWith("AIza")
    
    console.log("Anthropic API key available:", hasAnthropicKey)
    console.log("Gemini API key available:", hasGeminiKey)
    
  // Check for gibberish text from user (skip for greeting)
    const lastUserMessage = messages[messages.length - 1]
    const userText = lastUserMessage?.role === "user" 
      ? (lastUserMessage.parts || []).filter((p: any) => p.type === "text").map((p: any) => p.text).join("")
      : ""
    
    const isGreeting = userText === "START_INTERVIEW_GREETING"
    
    if (!isGreeting && isGibberishText(userText)) {
      console.log("Gibberish detected, returning feedback message")
      const gibberishResponse = getGibberishResponse()
      
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(controller) {
          const words = gibberishResponse.split(" ")
          for (let i = 0; i < words.length; i++) {
            const word = words[i] + (i < words.length - 1 ? " " : "")
            const chunk = `data: ${JSON.stringify({ type: "text-delta", delta: word })}\n\n`
            controller.enqueue(encoder.encode(chunk))
            await new Promise((resolve) => setTimeout(resolve, 25))
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"))
          controller.close()
        },
      })
      
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          ...rateLimitHeaders,
          "X-Content-Type-Options": "nosniff",
        },
      })
    }
    
    let response: string
    
    try {
      // Try Claude first if key is available and not the placeholder
      if (hasAnthropicKey && process.env.ANTHROPIC_API_KEY !== "your_anthropic_api_key_here") {
        console.log("Trying Claude API")
        try {
          response = await generateClaudeResponse(context, messages)
        } catch (claudeError) {
          console.log("Claude API failed, trying Gemini as fallback")
          if (hasGeminiKey) {
            response = await generateGeminiResponse(context, messages)
          } else {
            throw claudeError // Re-throw if no Gemini fallback
          }
        }
      } else if (hasGeminiKey) {
        // Use Gemini if Claude is not available
        console.log("Using Gemini API")
        response = await generateGeminiResponse(context, messages)
      } else {
        console.log("Using fallback response (no valid API keys)")
        return fallbackResponse(messages, context, rateLimitHeaders)
      }
    } catch (apiError: any) {
      console.error("All API attempts failed:", apiError)
      return fallbackResponse(messages, context, rateLimitHeaders)
    }

    // Stream the response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const words = response.split(" ")
        for (let i = 0; i < words.length; i++) {
          const word = words[i] + (i < words.length - 1 ? " " : "")
          const chunk = `data: ${JSON.stringify({ type: "text-delta", delta: word })}\n\n`
          controller.enqueue(encoder.encode(chunk))
          await new Promise((resolve) => setTimeout(resolve, 25))
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"))
        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        ...rateLimitHeaders,
        "X-Content-Type-Options": "nosniff",
      },
    })

  } catch (error: any) {
    console.error("Interview API error:", error)
    const errorMessage = error?.message || error?.toString() || "Unknown error"
    return new Response(
      JSON.stringify({ error: `Server error: ${errorMessage}` }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
}

function getDefaultContext(): InterviewContext {
  return {
    jobTitle: "Software Developer",
    jobDescription: "A software development position",
    jobRequirements: ["Programming", "Problem Solving"],
    company: "the company",
    candidateCredentials: "Not provided",
    candidateName: "Candidate",
    candidateEmail: "",
  }
}

function getInterviewPrompt(context: InterviewContext, messages: UIMessage[]): string {
  const lastMessage = messages[messages.length - 1]
  const userResponse = lastMessage?.role === "user" 
    ? (lastMessage.parts || []).filter((p: any) => p.type === "text").map((p: any) => p.text).join("")
    : ""
  
  // Check if this is the greeting or first real message
  const isGreeting = userResponse === "START_INTERVIEW_GREETING"
  const userMessages = messages.filter(m => m.role === "user" && 
    (m.parts || []).filter((p: any) => p.type === "text").map((p: any) => p.text).join("") !== "START_INTERVIEW_GREETING")
  const isFirstRealMessage = userMessages.length === 1 && userMessages[0] === lastMessage
  
  const conversationHistory = messages
    .filter((m: UIMessage) => m.role !== "system")
    .slice(-6) // Keep last 6 messages for context
    .map((m: UIMessage) => {
      const text = (m.parts || []).filter((p: any) => p.type === "text").map((p: any) => p.text).join("")
      return `${m.role}: ${text}`
    })
    .join("\n")

  if (isGreeting || isFirstRealMessage) {
    return `You are "Haveloc", an expert, empathetic AI Technical Recruiter conducting an initial screening interview.

CONTEXT:
You will be provided with the Candidate's Resume or Candidate Details, the target Job Description, and the ongoing conversation history.

PRIMARY APPROACH: Let the AI model generate natural, relevant questions based on the job requirements and candidate's background. Only use basic generic questions as a secondary fallback when you absolutely cannot generate relevant ones from the specific job and candidate details.

GUIDELINES:
1. ROLE ADAPTATION: Adapt your questions to the specific Job Description - a Data Science interview should sound different from a UI/UX Design interview.
2. NATURAL QUESTIONS FIRST: Start with questions that naturally arise from analyzing the job requirements and candidate's resume/projects.
3. CONVERSATION FLOW: Ask follow-up questions that build naturally on what the candidate says.
4. FORMAT: Ask ONLY ONE question at a time. Keep responses conversational and human-like (2-3 sentences max).

Job Details:
- Position: ${context.jobTitle}
- Description: ${context.jobDescription}
- Requirements: ${context.jobRequirements.join(", ")}

Candidate:
- Name: ${context.candidateName}
- Email: ${context.candidateEmail}
- Credentials/Resume: ${context.candidateCredentials}

Your task: Give a warm, professional greeting to ${context.candidateName}. Introduce yourself as Haveloc, the AI Technical Recruiter, mention the position they're applying for, and ask an opening question that welcomes them and connects to the job requirements.`
  }

  return `You are "Haveloc", an expert, empathetic AI Technical Recruiter conducting an initial screening interview.

CONTEXT:
You will be provided with the Candidate's Resume or Canditate Details, the target Job Description, and the ongoing conversation history.

CRITICAL INSTRUCTIONS - READ CAREFULLY:
1. ROLE ADAPTATION: Completely adapt your persona and questions to the specific Job Description. A Data Science interview should sound entirely different from a UI/UX Design interview.
2. HIGH VARIANCE (NO STOCK QUESTIONS): NEVER ask generic HR questions like "Tell me about yourself", "What are your strengths?", or "Why do you want this job?".
3. SCENARIO-BASED ONLY: Formulate highly specific, scenario-based questions by cross-referencing the required skills in the Job Description with the past projects listed on their Resume.
4. STRICT NON-REPETITION: Before asking a question, silently analyze the conversation history. NEVER ask about a skill, project, or topic that has already been covered. If you just asked about React, your next question must pivot to a completely different requirement (like testing, deployment, or soft skills).
5. RANDOMIZED ANGLES: To ensure no two interviews are the same, randomly vary your angle of questioning. Pick a random detail from their resume that matches the job and drill into it.
6. DYNAMIC FOLLOW-UPS: If the candidate's answer is shallow, do not move on. Your next question MUST challenge them to dive deeper into the technical specifics or architecture of the answer they just gave.
7. FORMAT: Ask ONLY ONE question at a time. Keep your response conversational, human-like, and concise (maximum 2-3 sentences) so it sounds natural when spoken aloud via Text-to-Speech. Do not use markdown formatting, asterisks, or bullet points.

Job Details:
- Position: ${context.jobTitle}
- Description: ${context.jobDescription}
- Requirements: ${context.jobRequirements.join(", ")}

Candidate Profile:
- Name: ${context.candidateName}
- Credentials/Resume: ${context.candidateCredentials}

Full Conversation History:
${conversationHistory}

Candidate's LAST response: "${userResponse}"

YOUR TASK:
Analyze the candidate's last response carefully. Then:

1. If this is their first real answer (not the greeting trigger), acknowledge something specific they mentioned and show genuine interest
2. Ask a follow-up question that directly relates to what they just told you, connecting it to the job requirements when possible
3. Show genuine curiosity - ask for details, examples, or clarification with human-like enthusiasm
4. Vary your questioning style and topics for each interview - never ask the same questions even for repeat candidates

EXAMPLES of good follow-ups:
- If they mention a skill: "That's impressive! Can you walk me through a specific example of how you've applied ${skill} in a project, and how that relates to what we'd need here?"
- If they talk about experience: "That sounds like valuable experience. What was the most challenging aspect you faced, and how did you overcome it?"
- If they mention a project: "I'd love to hear more about your role in that project. What was your specific contribution, and what did you learn from it?"
- If they give a vague answer: "I appreciate you sharing that. Could you give me a concrete example? I'm really interested in understanding your approach."
- If they mention something unrelated: "That's fascinating! How do you think that experience would translate to the ${context.jobTitle} role we're discussing?"`
}

function fallbackResponse(
  messages: UIMessage[],
  context: InterviewContext,
  rateLimitHeaders: Record<string, string>
): Response {
  const isFirstMessage = messages.length <= 1
  let response: string

  if (isFirstMessage) {
    response = `Hello ${context.candidateName}! I'm delighted to meet you today. As a senior HR professional at ${context.company} with over 15 years of experience, I'm truly excited to learn more about you and your fit for our ${context.jobTitle} position.\n\nTo get us started, could you tell me a bit about yourself and what particularly drew you to apply for this role?`
  } else {
    // Get the user's last actual response (not the greeting trigger)
    const userMessages = messages.filter((m) => m.role === "user" && 
      (m.parts || []).filter((p: any) => p.type === "text").map((p: any) => p.text).join("") !== "START_INTERVIEW_GREETING")
    const lastUserAnswer = userMessages.length > 0 ? 
      (userMessages[userMessages.length - 1].parts || []).filter((p: any) => p.type === "text").map((p: any) => p.text).join("") : ""
    const previousAnswers = userMessages.map(m => 
      (m.parts || []).filter((p: any) => p.type === "text").map((p: any) => p.text).join("")
    ).join(" ")
    
    // Extract potential skills/experience mentioned by candidate
    const commonSkills = [
      "javascript", "typescript", "python", "java", "react", "angular", "vue", "node", 
      "aws", "azure", "gcp", "docker", "kubernetes", "sql", "nosql", "mongodb", "postgres",
      "machine learning", "ai", "data science", "analytics", "leadership", "management",
      "agile", "scrum", "git", "ci/cd", "testing", "automation", "cloud", "devops"
    ]
    
    const mentionedSkills = commonSkills.filter(skill => 
      previousAnswers.toLowerCase().includes(skill.toLowerCase())
    )
    
    const questionCount = userMessages.length
    
    // Generate context-aware fallback question
    if (lastUserAnswer.length < 10) {
      // Very short answer
      response = `I appreciate you sharing that, but I'd love to hear a bit more detail. Could you elaborate on your experience? I'm genuinely interested in understanding your background better.`
    } else if (mentionedSkills.length > 0 && questionCount <= 3) {
      // They mentioned specific skills - ask about one
      const skill = mentionedSkills[0]
      response = `That's impressive that you mentioned ${skill}! Can you walk me through a specific project where you applied this skill and tell me about the impact it had?`
    } else if (previousAnswers.toLowerCase().includes("project") && questionCount <= 4) {
      // They mentioned a project
      response = `Projects like that are so valuable to hear about. What was your specific role in that project, and what was the most challenging part you encountered?`
    } else if (previousAnswers.toLowerCase().includes("team") || previousAnswers.toLowerCase().includes("lead")) {
      // Leadership/team related
      response = `Team dynamics are so important in our work. Can you share a situation where you had to navigate a team challenge or motivate your colleagues?`
    } else if (questionCount === 1) {
      response = `That's a wonderful introduction! I'm curious - can you tell me about a specific accomplishment in your career that you're particularly proud of?`
    } else if (questionCount === 2) {
      response = `How fascinating! In our fast-paced industry, staying current is key. How do you keep up with new trends and continue developing your skills?`
    } else if (questionCount === 3) {
      // Connect to job requirements if available
      const requirement = context.jobRequirements[0] || "this role"
      response = `Given your background and what we're looking for in ${requirement}, how do you see yourself contributing to our team and making an impact?`
    } else if (questionCount === 4) {
      response = `Every role has its challenges. Can you describe a difficult situation at work and walk me through how you approached solving it?`
    } else if (questionCount >= 5) {
      // End interview after 5+ questions
      response = `Thank you so much for your time today, ${context.candidateName}! It's been a pleasure speaking with you. This concludes our interview, and we'll be in touch soon regarding next steps. [INTERVIEW_COMPLETE]`
    } else {
      // Generic but attempts to acknowledge previous answer
      response = `Thanks for sharing that insight. Based on what you've told me, could you dive deeper into your technical approach and decision-making process? I'm really interested in your methodology.`
    }
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const words = response.split(" ")
      for (let i = 0; i < words.length; i++) {
        const word = words[i] + (i < words.length - 1 ? " " : "")
        const chunk = `data: ${JSON.stringify({ type: "text-delta", delta: word })}\n\n`
        controller.enqueue(encoder.encode(chunk))
        await new Promise((resolve) => setTimeout(resolve, 30))
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"))
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      ...rateLimitHeaders,
      "X-Content-Type-Options": "nosniff",
    },
  })
}

// Generate response using Claude API
async function generateClaudeResponse(context: InterviewContext, messages: UIMessage[]): Promise<string> {
  const prompt = getInterviewPrompt(context, messages)
  
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-haiku-20240307",
      max_tokens: 500,
      temperature: 0.7,
      messages: [{ role: "user", content: prompt }],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Claude API error: ${error}`)
  }

  const data = await response.json()
  return data.content[0]?.text || "I'm sorry, I couldn't generate a response."
}

// Generate response using Gemini API
async function generateGeminiResponse(context: InterviewContext, messages: UIMessage[]): Promise<string> {
  const prompt = getInterviewPrompt(context, messages)
  
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
  
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 500,
    },
  })

  return result.response.text()
}

// Detect gibberish/nonsense text from user
function isGibberishText(text: string): boolean {
  if (!text || text.trim().length === 0) return false
  
  const trimmed = text.trim()
  
  // Too short (less than 2 characters) - but allow single words
  if (trimmed.length < 2) return true
  
  // Check for random character patterns (very high consonant/vowel ratio)
  const vowels = 'aeiouAEIOU'
  const vowelCount = [...trimmed].filter(c => vowels.includes(c)).length
  const letterCount = [...trimmed].filter(c => /[a-zA-Z]/.test(c)).length
  
  // If more than 85% consonants and longer than 5 chars, likely gibberish
  if (letterCount > 5 && vowelCount / letterCount < 0.15) return true
  
  // Check for repeating same character pattern (e.g., "asdfasdfasdf")
  const repeatingPattern = /(.{1,3})\1{3,}/
  if (repeatingPattern.test(trimmed)) return true
  
  // Check for keyboard mashing patterns (more specific)
  const keyboardMash = /^(?:asdf+|jkl;+|qwer+|zxcv+|1234+|wasd+|[fjdksla;]+)$/i
  if (keyboardMash.test(trimmed) && trimmed.length > 6) return true
  
  // Check for no real words (at least one word should be dictionary-like for longer texts)
  const words = trimmed.split(/\s+/)
  const hasRealWords = words.some(word => {
    const cleanWord = word.replace(/[^a-zA-Z]/g, '')
    return cleanWord.length > 2 && /^[a-zA-Z]+$/.test(cleanWord)
  })
  if (words.length > 3 && !hasRealWords && trimmed.length > 10) return true
  
  // Too many special characters/numbers for a normal sentence (less strict)
  const specialChars = trimmed.replace(/[a-zA-Z\s]/g, '').length
  if (specialChars > trimmed.length * 0.5) return true
  
  return false
}

function getGibberishResponse(): string {
  const responses = [
    "I notice your response seems a bit unclear. Could you please provide a more detailed answer? I'm here to learn about your experience.",
    "I didn't quite catch that. Could you rephrase or elaborate? Feel free to share more about your background.",
    "That response seems a bit brief or unclear. Could you provide more details so I can better understand your experience?",
    "I'm having trouble understanding your answer. Could you try explaining it in a different way?",
  ]
  return responses[Math.floor(Math.random() * responses.length)]
}
