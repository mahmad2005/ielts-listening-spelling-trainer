export interface SpeakOptions {
  voiceURI?: string
  rate?: number
  lang?: string
}

const DEFAULT_TTS_LANG = 'en-CA'
const VOICE_FALLBACK_ORDER = ['en-CA', 'en-GB', 'en-US']

function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && Boolean(window.speechSynthesis)
}

function getVoiceByLanguagePrefix(voices: SpeechSynthesisVoice[], prefix: string): SpeechSynthesisVoice | undefined {
  const lowerPrefix = prefix.toLowerCase()
  return voices.find((voice) => voice.lang.toLowerCase().startsWith(lowerPrefix))
}

function resolveVoice(voices: SpeechSynthesisVoice[], options: SpeakOptions): SpeechSynthesisVoice | undefined {
  if (options.voiceURI) {
    const selectedVoice = voices.find((voice) => voice.voiceURI === options.voiceURI)
    if (selectedVoice) {
      return selectedVoice
    }
  }

  for (const language of VOICE_FALLBACK_ORDER) {
    const voice = getVoiceByLanguagePrefix(voices, language)
    if (voice) {
      return voice
    }
  }

  return voices.find((voice) => voice.lang.toLowerCase().startsWith('en')) ?? voices.find((voice) => voice.default) ?? voices[0]
}

export function cancelSpeech(): void {
  if (!isSpeechSynthesisSupported()) {
    return
  }

  window.speechSynthesis.cancel()
}

export function getVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSynthesisSupported()) {
    return []
  }

  return window.speechSynthesis.getVoices()
}

export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!isSpeechSynthesisSupported()) {
      resolve([])
      return
    }

    const voices = getVoices()
    if (voices.length > 0) {
      resolve(voices)
      return
    }

    let settled = false
    let timeoutId: number | null = null

    const finish = () => {
      if (settled) {
        return
      }

      settled = true
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged)

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
      }

      resolve(getVoices())
    }

    const handleVoicesChanged = () => {
      finish()
    }

    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged)

    timeoutId = window.setTimeout(() => {
      finish()
    }, 1500)
  })
}

export async function speakText(text: string, options: SpeakOptions = {}): Promise<boolean> {
  if (!isSpeechSynthesisSupported() || !text.trim()) {
    return false
  }

  cancelSpeech()

  const utterance = new SpeechSynthesisUtterance(text)
  const voices = await loadVoices()
  const selectedVoice = resolveVoice(voices, options)

  utterance.lang = options.lang ?? selectedVoice?.lang ?? DEFAULT_TTS_LANG
  utterance.rate = options.rate ?? 0.85

  if (selectedVoice) {
    utterance.voice = selectedVoice
    utterance.lang = selectedVoice.lang || utterance.lang
  }

  return await new Promise<boolean>((resolve) => {
    let settled = false

    const finish = (started: boolean) => {
      if (settled) {
        return
      }

      settled = true
      utterance.onstart = null
      utterance.onend = null
      utterance.onerror = null
      resolve(started)
    }

    utterance.onstart = () => {
      finish(true)
    }

    utterance.onend = () => {
      if (!settled) {
        finish(true)
      }
    }

    utterance.onerror = () => {
      finish(false)
    }

    try {
      window.speechSynthesis.speak(utterance)
    } catch {
      finish(false)
    }
  })
}
