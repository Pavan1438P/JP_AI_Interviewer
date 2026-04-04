import { NextRequest, NextResponse } from "next/server"

export const maxDuration = 30
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const { text, voiceId = "21m00Tcm4TlvDq8ikWAM" } = await req.json()

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      )
    }

    const apiKey = process.env.ELEVENLABS_API_KEY

    if (!apiKey) {
      console.warn("ElevenLabs API key not configured")
      return NextResponse.json(
        { error: "Speech synthesis not available" },
        { status: 503 }
      )
    }

    // Clean text before sending to API
    const cleanText = text
      .replace(/\[interview_complete\]/gi, "")
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/`/g, "")
      .replace(/\n\n+/g, " ")
      .trim()

    if (cleanText.length === 0) {
      return NextResponse.json(
        { error: "No valid text to convert" },
        { status: 400 }
      )
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
      throw new Error(
        `ElevenLabs API error: ${response.status} - ${
          errorData.detail?.message ||
          errorData.error ||
          "Failed to generate speech"
        }`
      )
    }

    // Get audio as buffer
    const audioBuffer = await response.arrayBuffer()

    // Return audio with proper headers
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-cache",
      },
    })
  } catch (error) {
    console.error("Text-to-speech API error:", error)
    return NextResponse.json(
      { error: "Failed to generate speech" },
      { status: 500 }
    )
  }
}
