import { normalizeAnswer } from './normalizeAnswer'
import type {
  FavouriteWordRecord,
  PracticeResult,
  PracticeSettings,
  WeakWordRecord,
} from '../types'

const SETTINGS_KEY = 'ielts.spell.settings'
const WEAK_WORDS_KEY = 'ielts.spell.weakWords'
const FAVOURITE_WORDS_KEY = 'ielts.spell.favourites'
const LATEST_RESULT_KEY = 'ielts.spell.latestResult'
const VOICE_URI_KEY = 'ielts.spell.voiceURI'

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) {
      return fallback
    }

    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJSON<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch {
    // Ignore write failures (e.g. storage quota or privacy mode restrictions).
  }
}

export function makeWeakWordKey(section: string, word: string): string {
  return `${normalizeAnswer(section)}::${normalizeAnswer(word)}`
}

function toWeakWordRecord(record: Partial<WeakWordRecord> & Pick<WeakWordRecord, 'key' | 'section' | 'word'>): WeakWordRecord {
  const practiceCount = Math.max(0, record.practiceCount ?? (record.wrongCount ?? 0) + (record.correctCount ?? 0))
  const correctCount = Math.max(0, record.correctCount ?? 0)
  const wrongCount = Math.max(0, record.wrongCount ?? 0)
  const timeoutCount = Math.max(0, record.timeoutCount ?? 0)

  return {
    key: record.key,
    section: record.section,
    word: record.word,
    practiceCount,
    correctCount,
    wrongCount,
    timeoutCount,
    averageResponseTimeMs: Math.max(0, record.averageResponseTimeMs ?? 0),
    lastPracticedAt: record.lastPracticedAt ?? record.updatedAt ?? new Date().toISOString(),
    correctStreak: Math.max(0, record.correctStreak ?? 0),
    updatedAt: record.updatedAt ?? new Date().toISOString(),
  }
}

export function getSavedSettings(): PracticeSettings | null {
  return readJSON<PracticeSettings | null>(SETTINGS_KEY, null)
}

export function saveSettings(settings: PracticeSettings): void {
  writeJSON(SETTINGS_KEY, settings)
}

export function getWeakWords(): WeakWordRecord[] {
  const raw = readJSON<Array<Partial<WeakWordRecord> & Pick<WeakWordRecord, 'key' | 'section' | 'word'>>>(
    WEAK_WORDS_KEY,
    [],
  )

  return raw.map((record) => toWeakWordRecord(record))
}

export function saveWeakWords(records: WeakWordRecord[]): void {
  writeJSON(WEAK_WORDS_KEY, records)
}

export function addWeakWordManually(section: string, word: string): void {
  const key = makeWeakWordKey(section, word)
  const records = getWeakWords()
  const index = records.findIndex((record) => record.key === key)

  if (index >= 0) {
    saveWeakWords(records)
    return
  }

  records.push({
    key,
    section,
    word,
    practiceCount: 0,
    correctCount: 0,
    wrongCount: 0,
    timeoutCount: 0,
    averageResponseTimeMs: 0,
    lastPracticedAt: new Date().toISOString(),
    correctStreak: 0,
    updatedAt: new Date().toISOString(),
  })
  saveWeakWords(records)
}

export function removeWeakWord(section: string, word: string): void {
  const key = makeWeakWordKey(section, word)
  const next = getWeakWords().filter((record) => record.key !== key)
  saveWeakWords(next)
}

export function updateWeakWordProgress(
  section: string,
  word: string,
  result: 'correct' | 'wrong' | 'timeout',
  timeTakenMs: number,
): void {
  const key = makeWeakWordKey(section, word)
  const records = getWeakWords()
  const index = records.findIndex((record) => record.key === key)
  const now = new Date().toISOString()

  if (index < 0) {
    if (result === 'correct') {
      return
    }

    records.push({
      key,
      section,
      word,
      practiceCount: 0,
      correctCount: 0,
      wrongCount: 0,
      timeoutCount: 0,
      averageResponseTimeMs: 0,
      lastPracticedAt: now,
      correctStreak: 0,
      updatedAt: now,
    })
  }

  const targetIndex = records.findIndex((record) => record.key === key)
  const existing = records[targetIndex]
  const nextPracticeCount = existing.practiceCount + 1
  const nextAverageMs =
    nextPracticeCount <= 1
      ? Math.max(0, timeTakenMs)
      : (existing.averageResponseTimeMs * existing.practiceCount + Math.max(0, timeTakenMs)) /
        nextPracticeCount

  let updated: WeakWordRecord = {
    ...existing,
    practiceCount: nextPracticeCount,
    averageResponseTimeMs: nextAverageMs,
    lastPracticedAt: now,
    updatedAt: now,
  }

  if (result === 'correct') {
    updated = {
      ...updated,
      correctCount: updated.correctCount + 1,
      correctStreak: updated.correctStreak + 1,
    }

    // Remove from weak list only after 3 consecutive correct answers.
    if (updated.correctStreak >= 3) {
      records.splice(targetIndex, 1)
      saveWeakWords(records)
      return
    }
  } else if (result === 'timeout') {
    updated = {
      ...updated,
      timeoutCount: updated.timeoutCount + 1,
      correctStreak: 0,
    }
  } else {
    updated = {
      ...updated,
      wrongCount: updated.wrongCount + 1,
      correctStreak: 0,
    }
  }

  records[targetIndex] = updated
  saveWeakWords(records)
}

export function getFavouriteWords(): FavouriteWordRecord[] {
  return readJSON<FavouriteWordRecord[]>(FAVOURITE_WORDS_KEY, [])
}

export function saveFavouriteWords(records: FavouriteWordRecord[]): void {
  writeJSON(FAVOURITE_WORDS_KEY, records)
}

export function toggleFavouriteWord(section: string, word: string): void {
  const key = makeWeakWordKey(section, word)
  const favourites = getFavouriteWords()
  const existingIndex = favourites.findIndex((record) => record.key === key)

  if (existingIndex >= 0) {
    favourites.splice(existingIndex, 1)
    saveFavouriteWords(favourites)
    return
  }

  favourites.push({
    key,
    section,
    word,
    createdAt: new Date().toISOString(),
  })
  saveFavouriteWords(favourites)
}

export function saveSelectedVoiceURI(voiceURI: string): void {
  writeJSON(VOICE_URI_KEY, voiceURI)
}

export function getSavedVoiceURI(): string {
  return readJSON<string>(VOICE_URI_KEY, '')
}

export function saveLatestResult(result: PracticeResult): void {
  writeJSON(LATEST_RESULT_KEY, result)
}

export function getLatestResult(): PracticeResult | null {
  return readJSON<PracticeResult | null>(LATEST_RESULT_KEY, null)
}
