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
    return `You are an experienced, friendly interviewer at ${context.company}. 

Job Details:
- Position: ${context.jobTitle}
- Description: ${context.jobDescription}
- Requirements: ${context.jobRequirements.join(", ")}

Candidate:
- Name: ${context.candidateName}
- Email: ${context.candidateEmail}
- Credentials/Resume: ${context.candidateCredentials}

Your task: Give a warm, professional greeting to ${context.candidateName}. Introduce yourself as the interviewer, mention the position they're applying for, and ask an opening question that:
1. Welcomes them warmly
2. Mentions the specific role (${context.jobTitle})
3. Asks about their background or why they're interested

Keep it conversational, empathetic, and human-like. Don't be too robotic.`
  }

  return `You are an experienced, friendly interviewer at ${context.company}. You are conducting a job interview for the ${context.jobTitle} position.

IMPORTANT: You must listen carefully to what the candidate says and ask relevant follow-up questions based on their specific answers. Don't ignore their responses.

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

1. If this is their first real answer (not the greeting trigger), acknowledge something specific they mentioned
2. Ask a follow-up question that directly relates to what they just told you
3. Connect their answer to the job requirements when possible
4. Show genuine curiosity - ask for details, examples, or clarification

EXAMPLES of good follow-ups:
- If they mention a skill: "You mentioned [skill]. Can you give me a specific example of how you've used that?"
- If they talk about experience: "That sounds interesting. What was the most challenging part of that experience?"
- If they mention a project: "Tell me more about your role in that project. What was your specific contribution?"
- If they give a vague answer: "Could you elaborate on that? I'd love to hear more details."
- If they mention something unrelated: "That's interesting. How do you think that experience relates to this ${context.jobTitle} role?"

RULES:
- Reference specific things they said in their answer
- Ask open-ended questions that require more than yes/no
- If they give short/unclear answers, politely ask for more detail
- After 4-5 meaningful exchanges, wrap up with: "Thank you for your time today, ${context.candidateName}. I believe we have covered everything we need. [INTERVIEW_COMPLETE] We'll be in touch soon regarding next steps."
- Be warm, professional, and show you're actually listening
- NEVER ask a generic question that ignores what they just said

Now, based on their last response "${userResponse}", what's your follow-up question?`
}

function fallbackResponse(
  messages: UIMessage[],
  context: InterviewContext,
  rateLimitHeaders: Record<string, string>
): Response {
  const isFirstMessage = messages.length <= 1
  let response: string

  if (isFirstMessage) {
    response = `Hello ${context.candidateName}! Welcome to your interview for the ${context.jobTitle} position at ${context.company}. I'm excited to learn more about you today.\n\nTo start, could you tell me a bit about yourself and what drew you to apply for this position?`
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
      response = `I see you gave a brief response. Could you elaborate a bit more on that? I'd love to hear more details about your experience.`
    } else if (mentionedSkills.length > 0 && questionCount <= 3) {
      // They mentioned specific skills - ask about one
      const skill = mentionedSkills[0]
      response = `You mentioned ${skill}. Can you tell me about a specific project where you used ${skill} and what you accomplished?`
    } else if (previousAnswers.toLowerCase().includes("project") && questionCount <= 4) {
      // They mentioned a project
      response = `That project sounds interesting. What was your specific role, and what was the most challenging aspect you faced?`
    } else if (previousAnswers.toLowerCase().includes("team") || previousAnswers.toLowerCase().includes("lead")) {
      // Leadership/team related
      response = `You mentioned working with teams. Can you describe a situation where you had to resolve a conflict or motivate your team?`
    } else if (questionCount === 1) {
      response = `That's a great introduction! Can you tell me about a specific accomplishment you're particularly proud of in your career?`
    } else if (questionCount === 2) {
      response = `Interesting! How do you stay current with industry trends and continue developing your skills?`
    } else if (questionCount === 3) {
      // Connect to job requirements if available
      const requirement = context.jobRequirements[0] || "this role"
      response = `Given your background and the requirements for ${requirement}, how do you see yourself contributing to our team?`
    } else if (questionCount === 4) {
      response = `Can you describe a challenging situation at work and how you approached solving it?`
    } else if (questionCount >= 5) {
      // End interview after 5+ questions
      response = `Thank you so much for your time today, ${context.candidateName}! This concludes our interview. We'll be in touch soon. [INTERVIEW_COMPLETE]`
    } else {
      // Generic but attempts to acknowledge previous answer
      response = `Thanks for sharing that. Based on what you've told me, could you dive deeper into your technical approach and decision-making process?`
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
