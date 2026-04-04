import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { 
          error: "API key not configured",
          hasApiKey: false,
          apiKeyLength: 0,
        },
        { status: 500 }
      )
    }

    // Test the ElevenLabs API
    const testResponse = await fetch(
      "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text: "This is a test.",
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    )

    const responseText = await testResponse.text()

    return NextResponse.json({
      success: testResponse.ok,
      status: testResponse.status,
      statusText: testResponse.statusText,
      headers: Object.fromEntries(testResponse.headers),
      body: responseText.substring(0, 500), // First 500 chars
      apiKeyConfigured: !!apiKey,
      apiKeyLength: apiKey.length,
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 })
  }
}
