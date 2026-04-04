/**
 * ElevenLabs Text-to-Speech Service
 * Converts interview responses to natural-sounding speech using ElevenLabs API
 */

interface TextToSpeechOptions {
  voiceId?: string
  stability?: number
  similarityBoost?: number
}

/**
 * Convert text to speech using ElevenLabs API and play it automatically
 * @param text - The text to convert to speech
 * @param options - Optional configuration for voice and audio parameters
 * @returns Promise that resolves when audio playback is triggered
 */
export async function textToSpeech(
  text: string,
  options: TextToSpeechOptions = {}
): Promise<void> {
  const {
    voiceId = "21m00Tcm4TlvDq8ikWAM", // Rachel - professional, friendly voice
    stability = 0.5,
    similarityBoost = 0.75,
  } = options

  const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY

  if (!apiKey) {
    console.warn("ElevenLabs API key not configured. Speech synthesis disabled.")
    return
  }

  try {
    // Validate input
    if (!text || text.trim().length === 0) {
      console.warn("Empty text provided for speech synthesis")
      return
    }

    // Remove markdown, special formatting, and completion markers
    const cleanText = text
      .replace(/\[interview_complete\]/gi, "")
      .replace(/\*\*/g, "") // Remove markdown bold
      .replace(/\*/g, "") // Remove markdown italic
      .replace(/`/g, "") // Remove code blocks
      .replace(/\n\n+/g, " ") // Replace multiple newlines with space
      .trim()

    if (cleanText.length === 0) {
      return
    }

    console.log("Generating speech for:", cleanText.substring(0, 100) + "...")

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
            stability,
            similarity_boost: similarityBoost,
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

    // Get the audio blob
    const audioBlob = await response.blob()

    // Create object URL for the blob
    const audioUrl = URL.createObjectURL(audioBlob)

    // Create and play audio
    const audio = new Audio(audioUrl)
    audio.play()

    // Clean up the object URL when the audio finishes
    audio.addEventListener("ended", () => {
      URL.revokeObjectURL(audioUrl)
    })

    // Also clean up on error
    audio.addEventListener("error", () => {
      URL.revokeObjectURL(audioUrl)
    })
  } catch (error) {
    console.error("Text-to-speech error:", error)
    // Don't throw - allow the interview to continue even if speech fails
  }
}

/**
 * Mute speech synthesis (stops any currently playing audio)
 */
export function stopSpeech(): void {
  // Stop all audio elements on the page
  const audioElements = document.querySelectorAll("audio")
  audioElements.forEach((audio) => {
    audio.pause()
    audio.currentTime = 0
  })
}

/**
 * Check if ElevenLabs is configured
 */
export function isElevenLabsConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY
}
