/**
 * ElevenLabs Text-to-Speech Service with Web Speech API Fallback
 * Tries to use ElevenLabs first, falls back to browser's Web Speech API
 */

interface TextToSpeechOptions {
  voiceId?: string
}

/**
 * Convert text to speech using ElevenLabs API (with Web Speech fallback)
 * @param text - The text to convert to speech
 * @param options - Optional configuration for voice
 * @returns Promise that resolves when audio playback is triggered
 */
export async function textToSpeech(
  text: string,
  options: TextToSpeechOptions = {}
): Promise<void> {
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

    // Try ElevenLabs API first
    try {
      await useElevenLabsAPI(cleanText, options.voiceId)
      return
    } catch (elevenLabsError) {
      console.warn("ElevenLabs API failed, falling back to Web Speech API:", elevenLabsError)
      // Fall back to Web Speech API
      await useWebSpeechAPI(cleanText)
    }
  } catch (error) {
    console.error("Text-to-speech error:", error)
    // Don't throw - allow the interview to continue even if speech fails
  }
}

/**
 * Use ElevenLabs API for text-to-speech
 */
async function useElevenLabsAPI(
  cleanText: string,
  voiceId: string = "21m00Tcm4TlvDq8ikWAM"
): Promise<void> {
  const response = await fetch("/api/text-to-speech", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: cleanText,
      voiceId,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
    throw new Error(
      `ElevenLabs error: ${response.status} - ${
        errorData.error || "Failed to generate speech"
      }`
    )
  }

  // Get the audio blob
  const audioBlob = await response.blob()

  // Create object URL for the blob
  const audioUrl = URL.createObjectURL(audioBlob)

  // Create and play audio
  const audio = new Audio(audioUrl)
  await audio.play().catch((err) => {
    console.error("Audio playback error:", err)
    throw err
  })

  // Clean up the object URL when the audio finishes
  audio.addEventListener("ended", () => {
    URL.revokeObjectURL(audioUrl)
  })

  // Also clean up on error
  audio.addEventListener("error", () => {
    URL.revokeObjectURL(audioUrl)
  })
}

/**
 * Use browser's Web Speech API as fallback
 */
async function useWebSpeechAPI(text: string): Promise<void> {
  // Check if browser supports Web Speech API
  const SpeechSynthesisUtterance = window.SpeechSynthesisUtterance
  const speechSynthesis = window.speechSynthesis

  if (!SpeechSynthesisUtterance || !speechSynthesis) {
    throw new Error("Web Speech API not supported in this browser")
  }

  // Create utterance
  const utterance = new SpeechSynthesisUtterance(text)

  // Set voice properties for a professional sound
  utterance.rate = 1.0 // Normal speed
  utterance.pitch = 1.0 // Normal pitch
  utterance.volume = 1.0 // Full volume

  // Try to find a professional-sounding voice
  const voices = speechSynthesis.getVoices()
  const femaleVoice = voices.find(
    (voice) =>
      voice.name.includes("Google UK English Female") ||
      voice.name.includes("Samantha") ||
      voice.name.includes("Victoria") ||
      (voice.name.includes("Female") && voice.lang.includes("en"))
  )

  if (femaleVoice) {
    utterance.voice = femaleVoice
  }

  // Setup event handlers
  return new Promise((resolve, reject) => {
    utterance.onend = () => {
      console.log("Speech synthesis completed")
      resolve()
    }

    utterance.onerror = (event) => {
      console.error("Speech synthesis error:", event.error)
      reject(new Error(`Speech synthesis error: ${event.error}`))
    }

    // Speak the text
    speechSynthesis.speak(utterance)
  })
}

/**
 * Stop all speech synthesis (both ElevenLabs audio and Web Speech API)
 */
export function stopSpeech(): void {
  // Stop Web Speech API if available
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }

  // Stop all audio elements on the page
  const audioElements = document.querySelectorAll("audio")
  audioElements.forEach((audio) => {
    audio.pause()
    audio.currentTime = 0
  })
}

/**
 * Check if text-to-speech is available (either ElevenLabs or Web Speech API)
 */
export function isSpeechAvailable(): boolean {
  // Browser Web Speech API is available (fallback option)
  if (typeof window !== "undefined" && window.speechSynthesis) {
    return true
  }
  return false
}
