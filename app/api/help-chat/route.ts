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
    "To apply for a job on Haveloc:\n\n1. Browse the job listings on the home page\n2. Click the \"Apply\" button on any job that interests you\n3. Fill in your credentials and upload your resume (optional)\n4. Schedule your interview date and time\n5. Submit your application!\n\nOnce submitted, you can find your application in \"Applied Interviews\" from the menu.",
  interview:
    "The Haveloc interview process is simple:\n\n1. After applying, go to \"Applied Interviews\" from the menu\n2. Click \"Take Interview\" when you're ready\n3. Our AI interviewer will ask you questions based on:\n   - The job requirements\n   - Your profile and experience\n   - Your previous answers\n4. Answer naturally and professionally\n5. The interview concludes with a thank you message\n\nGood luck!",
  profile:
    "To update your profile:\n\n1. Click the menu icon in the top right\n2. Select \"My Profile\"\n3. Click \"Edit Profile\" button\n4. Update your information (name, email, skills, experience, education)\n5. Click \"Save\" when done\n\nYour profile information is used to personalize interview questions!",
  support:
    "For support, you can:\n\n1. Email us at support@haveloc.com\n2. Use this Help Center chatbot for common questions\n3. Check our FAQ section\n\nWe typically respond within 24 hours. Thanks for using Haveloc!",
  interested:
    "To mark a job as interested:\n\n1. Browse jobs on the home page\n2. Click the \"Interested\" button on any job card\n3. The job will be saved to your \"Interested Interviews\" list\n4. Access saved jobs from the menu under \"Interested Interviews\"\n\nThis is a great way to save jobs you want to apply for later!",
  domain:
    "You can filter jobs by domain:\n\n1. On the home page, look for the domain filter dropdown\n2. Select a domain: Technology, Data Science, Finance, Healthcare, Marketing, or Environment\n3. Only jobs in that domain will be shown\n4. Select \"All Domains\" to see all available jobs\n\nThis helps you find opportunities in your field of interest!",
  hello:
    "Hello! Welcome to the Haveloc Help Center. I'm here to assist you with any questions about our AI interview platform.\n\nHere are some things I can help you with:\n- How to apply for jobs\n- Understanding the interview process\n- Updating your profile\n- Using the interested/saved jobs feature\n- Filtering jobs by domain\n\nWhat would you like to know?",
  hi: "Hi there! Welcome to Haveloc Help Center. I'm happy to assist you!\n\nI can help you with:\n- Applying for jobs\n- Taking AI interviews\n- Managing your profile\n- Understanding platform features\n\nWhat can I help you with today?",
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
  return "Thanks for your question! I can help you with:\n\n- How to apply for jobs\n- Understanding the interview process\n- Managing your profile\n- Saving jobs you're interested in\n\nWhat would you like to know?"
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
