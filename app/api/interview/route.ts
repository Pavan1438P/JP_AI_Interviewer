import { UIMessage } from "ai"
import { createClient } from "@/lib/supabase/server"
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit"
import { GoogleGenerativeAI } from "@google/generative-ai"
import {
  type InterviewContext,
  getDefaultContext,
  getSystemPrompt,
  getGreetingPrompt,
  getFollowUpPrompt,
  extractCoveredTopics,
  buildSinglePrompt,
} from "@/lib/prompts"

export const maxDuration = 60
export const dynamic = "force-dynamic"

// Maximum request body size (50KB)
const MAX_BODY_SIZE = 50 * 1024
const MAX_MESSAGES = 20

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
      ? getMessageText(lastUserMessage)
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

// --- Helper: extract text from UIMessage ---
function getMessageText(m: UIMessage): string {
  return (m.parts || []).filter((p: any) => p.type === "text").map((p: any) => p.text).join("")
}

// --- Helper: convert UIMessages to simple {role, text} array ---
function toSimpleMessages(messages: UIMessage[]): { role: string; text: string }[] {
  return messages.map((m) => ({ role: m.role, text: getMessageText(m) }))
}

function fallbackResponse(
  messages: UIMessage[],
  context: InterviewContext,
  rateLimitHeaders: Record<string, string>
): Response {
  const simpleMessages = toSimpleMessages(messages)
  const isFirstMessage = messages.length <= 1
  let response: string

  if (isFirstMessage) {
    // Greeting that references the actual job
    response = `Hello ${context.candidateName}! I'm Haveloc, the AI interviewer here at ${context.company}. I'm excited to chat with you about the ${context.jobTitle} position today. To kick things off, I noticed the role requires ${context.jobRequirements[0] || "some key skills"}. Can you tell me about a recent project where you worked with that?`
  } else {
    const userMessages = simpleMessages.filter(
      (m) => m.role === "user" && m.text !== "START_INTERVIEW_GREETING"
    )
    const lastAnswer = userMessages[userMessages.length - 1]?.text || ""
    const questionCount = userMessages.length
    const coveredTopics = extractCoveredTopics(simpleMessages, context.jobRequirements)
    const uncoveredReqs = context.jobRequirements.filter(
      (req) => !coveredTopics.some((t) => t.toLowerCase().includes(req.toLowerCase()))
    )

    if (questionCount >= 6 || uncoveredReqs.length === 0) {
      response = `Thank you so much for your time today, ${context.candidateName}! It's been a great conversation. I've really enjoyed learning about your experience. We'll review everything and be in touch soon. [INTERVIEW_COMPLETE]`
    } else if (lastAnswer.length < 15) {
      response = `I'd love to hear more detail on that. Could you walk me through a specific example or situation? I'm really interested in understanding your hands-on experience.`
    } else {
      // Pick the next uncovered requirement
      const nextReq = uncoveredReqs[0] || context.jobRequirements[0]
      response = `That's a solid answer, thank you. Let me shift gears a bit. The ${context.jobTitle} role also requires ${nextReq}. Can you share a specific example of how you've applied that in a real project or work setting?`
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

// Generate response using Claude API with multi-turn conversation
async function generateClaudeResponse(context: InterviewContext, messages: UIMessage[]): Promise<string> {
  const simpleMessages = toSimpleMessages(messages)
  const lastUserText = simpleMessages[simpleMessages.length - 1]?.text || ""
  const isGreeting = lastUserText === "START_INTERVIEW_GREETING"

  // Build Claude messages: system prompt as system, then full conversation history
  const systemPrompt = getSystemPrompt(context)

  // Convert conversation history to Claude message format (full history, not truncated)
  const claudeMessages: { role: "user" | "assistant"; content: string }[] = []

  if (isGreeting) {
    claudeMessages.push({ role: "user", content: getGreetingPrompt(context) })
  } else {
    // Send the entire conversation as context, then the follow-up instruction
    for (const msg of simpleMessages) {
      if (msg.text === "START_INTERVIEW_GREETING") continue
      const role = msg.role === "user" ? "user" as const : "assistant" as const
      // Avoid consecutive same-role messages (Claude requirement)
      if (claudeMessages.length > 0 && claudeMessages[claudeMessages.length - 1].role === role) {
        claudeMessages[claudeMessages.length - 1].content += "\n" + msg.text
      } else {
        claudeMessages.push({ role, content: msg.text })
      }
    }

    // Add the follow-up instruction as a final user message
    const coveredTopics = extractCoveredTopics(simpleMessages, context.jobRequirements)
    const conversationText = simpleMessages
      .filter((m) => m.text !== "START_INTERVIEW_GREETING")
      .map((m) => `${m.role === "user" ? "Candidate" : "Haveloc"}: ${m.text}`)
      .join("\n")
    const followUp = getFollowUpPrompt(context, conversationText, lastUserText, coveredTopics)

    // Ensure the last message is from user (append instruction)
    if (claudeMessages.length > 0 && claudeMessages[claudeMessages.length - 1].role === "user") {
      claudeMessages[claudeMessages.length - 1].content += "\n\n[INTERVIEWER INSTRUCTION]: " + followUp
    } else {
      claudeMessages.push({ role: "user", content: "[INTERVIEWER INSTRUCTION]: " + followUp })
    }
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      temperature: 0.7,
      system: systemPrompt,
      messages: claudeMessages,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Claude API error: ${error}`)
  }

  const data = await response.json()
  return data.content[0]?.text || "I'm sorry, I couldn't generate a response."
}

// Generate response using Gemini API with multi-turn conversation
async function generateGeminiResponse(context: InterviewContext, messages: UIMessage[]): Promise<string> {
  const simpleMessages = toSimpleMessages(messages)
  const lastUserText = simpleMessages[simpleMessages.length - 1]?.text || ""
  const isGreeting = lastUserText === "START_INTERVIEW_GREETING"

  // Use buildSinglePrompt which combines system + history + follow-up for Gemini
  const prompt = buildSinglePrompt(context, simpleMessages, isGreeting)

  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

  // Build multi-turn chat history for Gemini
  const chatHistory: { role: "user" | "model"; parts: { text: string }[] }[] = []

  if (!isGreeting) {
    // Add system prompt as the first user message, with an ack from model
    chatHistory.push({ role: "user", parts: [{ text: getSystemPrompt(context) }] })
    chatHistory.push({ role: "model", parts: [{ text: "Understood. I am Haveloc and I will follow all the interview rules strictly." }] })

    // Add full conversation history as chat turns
    for (const msg of simpleMessages) {
      if (msg.text === "START_INTERVIEW_GREETING") continue
      const role = msg.role === "user" ? "user" as const : "model" as const
      if (chatHistory.length > 0 && chatHistory[chatHistory.length - 1].role === role) {
        chatHistory[chatHistory.length - 1].parts[0].text += "\n" + msg.text
      } else {
        chatHistory.push({ role, parts: [{ text: msg.text }] })
      }
    }
  }

  if (isGreeting) {
    // Simple single-turn for greeting
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 500 },
    })
    return result.response.text()
  }

  // Multi-turn chat for follow-ups
  const chat = model.startChat({
    history: chatHistory.slice(0, -1), // everything except the last user message
    generationConfig: { temperature: 0.7, maxOutputTokens: 500 },
  })

  // The last user message plus the follow-up instruction
  const coveredTopics = extractCoveredTopics(simpleMessages, context.jobRequirements)
  const conversationText = simpleMessages
    .filter((m) => m.text !== "START_INTERVIEW_GREETING")
    .map((m) => `${m.role === "user" ? "Candidate" : "Haveloc"}: ${m.text}`)
    .join("\n")
  const followUp = getFollowUpPrompt(context, conversationText, lastUserText, coveredTopics)

  const lastUserChatMsg = chatHistory.length > 0 && chatHistory[chatHistory.length - 1].role === "user"
    ? chatHistory[chatHistory.length - 1].parts[0].text
    : lastUserText

  const result = await chat.sendMessage(lastUserChatMsg + "\n\n[INTERVIEWER INSTRUCTION]: " + followUp)
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
