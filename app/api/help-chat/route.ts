import { UIMessage } from "ai"
import { createClient } from "@/lib/supabase/server"
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit"

export const maxDuration = 30
export const dynamic = "force-dynamic"

// Maximum request body size (10KB)
const MAX_BODY_SIZE = 10 * 1024

// Demo responses for help center
const demoResponses: Record<string, string> = {
  apply:
    "I'd be happy to walk you through applying for a job on Haveloc!\n\nHere's how it works:\n\n1. Start by browsing our job listings on the home page\n2. When you find something that interests you, click the \"Apply\" button\n3. Fill in your credentials and upload your resume (this is required)\n4. Choose your preferred interview date and time\n5. Submit your application!\n\nOnce submitted, you can track your application in \"Applied Interviews\" from the menu. I'm here if you have any questions along the way!",
  interview:
    "I'm excited to help you understand our interview process - it's designed to be as smooth as possible!\n\nHere's what happens after you apply:\n\n1. Head to \"Applied Interviews\" in the menu\n2. Click \"Take Interview\" when you're ready\n3. Our AI interviewer (who acts as a senior HR professional) will ask you thoughtful questions about:\n   - The specific job requirements\n   - Your background and experience\n   - Your previous answers\n4. Just answer naturally and professionally\n5. The interview wraps up with a friendly thank you\n\nYou'll do great! Feel free to ask me anything else about the process.",
  profile:
    "Updating your profile is straightforward, and it's so important for personalized interviews!\n\nHere's how to do it:\n\n1. Click the menu icon in the top right corner\n2. Select \"My Profile\" from the dropdown\n3. Click the \"Edit Profile\" button\n4. Update your information - name, email, skills, experience, education\n5. Don't forget to click \"Save\" when you're done\n\nYour profile helps our AI interviewer ask more relevant questions. I'm here if you need help with any of these steps!",
  support:
    "I'm sorry to hear you're having trouble - I want to make sure you get the help you need!\n\nHere are your support options:\n\n1. Email our team at support@haveloc.com (we usually respond within 24 hours)\n2. I'm right here in the Help Center for quick questions\n3. Check out our FAQ section for common answers\n\nThank you for using Haveloc - we truly appreciate your patience and feedback!",
  interested:
    "That's a smart way to keep track of opportunities! Here's how to mark jobs as interested:\n\n1. Browse the jobs on our home page\n2. Look for the \"Interested\" button on any job card that catches your eye\n3. Click it, and the job will be saved to your \"Interested Interviews\" list\n4. You can access all your saved jobs from the menu under \"Interested Interviews\"\n\nIt's a great way to bookmark jobs you want to apply for later. I hope you find some exciting opportunities!",
  domain:
    "Filtering by domain is such a helpful feature for finding the right opportunities!\n\nHere's how to use it:\n\n1. On the home page, you'll see a domain filter dropdown\n2. Choose from options like Technology, Data Science, Finance, Healthcare, Marketing, or Environment\n3. Only jobs in that domain will show up\n4. To see everything again, just select \"All Domains\"\n\nThis makes it so much easier to find opportunities in your field. What domain are you most interested in?",
  hello:
    "Hello there! Welcome to the Haveloc Help Center. I'm delighted to assist you with any questions about our AI interview platform.\n\nI'm here to help with:\n- How to apply for jobs\n- Understanding the interview process\n- Updating your profile\n- Using the interested/saved jobs feature\n- Filtering jobs by domain\n\nWhat would you like to know? I'm all ears!",
  hi: "Hi there! So glad you stopped by the Haveloc Help Center. I'm here and ready to help!\n\nI can assist you with:\n- Applying for jobs\n- Taking AI interviews\n- Managing your profile\n- Understanding our platform features\n\nWhat can I help you with today? I'm genuinely excited to support you!",
}

// Simple input sanitizer to prevent XSS
function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, "") // Remove < and > to prevent HTML tags
    .trim()
    .slice(0, 1000) // Limit length
}

function getDemoResponse(message: string): string {
  const lowerMessage = message.toLowerCase()

  // Check for keyword matches
  if (lowerMessage.includes("apply") || lowerMessage.includes("application")) {
    return demoResponses.apply
  }
  if (lowerMessage.includes("interview") || lowerMessage.includes("process")) {
    return demoResponses.interview
  }
  if (lowerMessage.includes("profile") || lowerMessage.includes("update")) {
    return demoResponses.profile
  }
  if (
    lowerMessage.includes("support") ||
    lowerMessage.includes("help") ||
    lowerMessage.includes("contact")
  ) {
    return demoResponses.support
  }
  if (lowerMessage.includes("interested") || lowerMessage.includes("save")) {
    return demoResponses.interested
  }
  if (lowerMessage.includes("domain") || lowerMessage.includes("filter")) {
    return demoResponses.domain
  }
  if (
    lowerMessage.includes("hello") ||
    lowerMessage.includes("hey") ||
    lowerMessage === "hi"
  ) {
    return demoResponses.hello
  }
  if (lowerMessage.includes("hi")) {
    return demoResponses.hi
  }

  // Default response - generic to avoid info leakage
  return "Thanks so much for reaching out! I'm here to help with anything Haveloc-related. I can assist you with:\n\n- How to apply for jobs\n- Understanding the interview process\n- Managing your profile\n- Saving jobs you're interested in\n\nWhat would you like to know? I'm genuinely excited to help you navigate our platform!"
}

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

    // Check rate limit (20 requests per minute per IP)
    const rateLimitResult = await checkRateLimit(`help-chat:${ip}`, {
      maxRequests: 20,
      windowMs: 60000,
    })

    const rateLimitHeaders = getRateLimitHeaders(
      rateLimitResult.allowed,
      rateLimitResult.remaining,
      rateLimitResult.resetTime,
      20
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

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid or missing messages array" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...rateLimitHeaders,
          },
        }
      )
    }

    // Get the last user message
    const lastMessage = messages[messages.length - 1]
    if (lastMessage?.role !== "user") {
      return new Response(
        JSON.stringify({ error: "Last message must be from user" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...rateLimitHeaders,
          },
        }
      )
    }

    const userText =
      (lastMessage?.parts || [])
        .filter(
          (p: { type: string; text?: string }): p is { type: "text"; text: string } =>
            p.type === "text"
        )
        .map((p: { text: string }) => p.text)
        .join("") || ""

    // Sanitize user input
    const sanitizedText = sanitizeInput(userText)

    if (!sanitizedText) {
      return new Response(
        JSON.stringify({ error: "Empty message content" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...rateLimitHeaders,
          },
        }
      )
    }

    const response = getDemoResponse(sanitizedText)

    // Simulate streaming by sending chunks
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        // Split response into words for simulated streaming
        const words = response.split(" ")
        for (let i = 0; i < words.length; i++) {
          const word = words[i] + (i < words.length - 1 ? " " : "")
          const chunk = `data: ${JSON.stringify({ type: "text-delta", delta: word })}\n\n`
          controller.enqueue(encoder.encode(chunk))
          // Small delay for natural feel
          await new Promise((resolve) => setTimeout(resolve, 20))
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
        // Security headers
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "strict-origin-when-cross-origin",
      },
    })
  } catch (error) {
    console.error("Help chat API error:", error)
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    )
  }
}
