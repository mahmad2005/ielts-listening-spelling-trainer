export interface SpeakOptions {
  voiceURI?: string
  rate?: number
  lang?: string
}

export function cancelSpeech(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return
  }

  window.speechSynthesis.cancel()
}

export function getVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return []
  }

  return window.speechSynthesis.getVoices()
}

export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve([])
      return
    }

    const voices = getVoices()
    if (voices.length > 0) {
      resolve(voices)
      return
    }

    const handleVoicesChanged = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged)
      resolve(getVoices())
    }

    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged)
  })
}

export function speakText(text: string, options: SpeakOptions = {}): void {
  if (typeof window === 'undefined' || !window.speechSynthesis || !text.trim()) {
    return
  }

  cancelSpeech()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = options.lang ?? 'en-CA'
  utterance.rate = options.rate ?? 0.85

  if (options.voiceURI) {
    const voice = getVoices().find((item) => item.voiceURI === options.voiceURI)
    if (voice) {
      utterance.voice = voice
    }
  }

  window.speechSynthesis.speak(utterance)
}
