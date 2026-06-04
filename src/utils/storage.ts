import { normalizeAnswer } from './normalizeAnswer'
import type {
  FavouriteWordRecord,
  ProfileData,
  PracticeResult,
  PracticeSettings,
  WeakWordRecord,
  WordStatRecord,
} from '../types'
import { getActiveProfile, getActiveProfileData, updateActiveProfileData } from './profileStorage'

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

function updateCurrentProfile(mutator: (current: ProfileData) => ProfileData): void {
  updateActiveProfileData(mutator)
}

function buildWordStats(records: PracticeResult['records'], currentStats: Record<string, WordStatRecord>): Record<string, WordStatRecord> {
  const nextStats = { ...currentStats }
  const practicedAt = new Date().toISOString()

  records.forEach((record) => {
    const key = makeWeakWordKey(record.section, record.correctWord)
    const existing = nextStats[key] ?? {
      key,
      section: record.section,
      word: record.correctWord,
      attempts: 0,
      correctCount: 0,
      wrongCount: 0,
      timeoutCount: 0,
      lastPracticedAt: practicedAt,
    }

    nextStats[key] = {
      ...existing,
      attempts: existing.attempts + 1,
      correctCount: existing.correctCount + (record.result === 'correct' ? 1 : 0),
      wrongCount: existing.wrongCount + (record.result === 'wrong' ? 1 : 0),
      timeoutCount: existing.timeoutCount + (record.result === 'timeout' ? 1 : 0),
      lastPracticedAt: practicedAt,
    }
  })

  return nextStats
}

export interface ProfileDashboardStats {
  profileName: string
  totalSessions: number
  weakWordCount: number
  lastScore: number | null
  bestScore: number | null
  accuracy: number
}

export function getSavedSettings(): PracticeSettings | null {
  return getActiveProfileData().settings
}

export function saveSettings(settings: PracticeSettings): void {
  updateCurrentProfile((current) => ({
    ...current,
    settings,
  }))
}

export function getWeakWords(): WeakWordRecord[] {
  const raw = getActiveProfileData().weakWords as Array<
    Partial<WeakWordRecord> & Pick<WeakWordRecord, 'key' | 'section' | 'word'>
  >

  return raw.map((record) => toWeakWordRecord(record))
}

export function saveWeakWords(records: WeakWordRecord[]): void {
  updateCurrentProfile((current) => ({
    ...current,
    weakWords: records,
  }))
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
  return getActiveProfileData().favourites
}

export function saveFavouriteWords(records: FavouriteWordRecord[]): void {
  updateCurrentProfile((current) => ({
    ...current,
    favourites: records,
  }))
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
  const currentSettings = getSavedSettings()
  if (!currentSettings) {
    return
  }

  saveSettings({
    ...currentSettings,
    voiceURI,
  })
}

export function getSavedVoiceURI(): string {
  return getSavedSettings()?.voiceURI ?? ''
}

export function saveLatestResult(result: PracticeResult): void {
  updateCurrentProfile((current) => ({
    ...current,
    resultHistory: [...current.resultHistory, result],
    wordStats: buildWordStats(result.records, current.wordStats),
  }))
}

export function getLatestResult(): PracticeResult | null {
  const history = getActiveProfileData().resultHistory
  return history.at(-1) ?? null
}

export function getResultHistory(): PracticeResult[] {
  return getActiveProfileData().resultHistory
}

export function getProfileDashboardStats(): ProfileDashboardStats {
  const activeProfile = getActiveProfile()
  const data = getActiveProfileData()
  const resultHistory = data.resultHistory
  const allRecords = resultHistory.flatMap((result) => result.records)
  const correctCount = allRecords.filter((record) => record.result === 'correct').length
  const accuracy = allRecords.length > 0 ? (correctCount / allRecords.length) * 100 : 0
  const lastScore = resultHistory.at(-1)?.totalScore ?? null
  const bestScore =
    resultHistory.length > 0
      ? resultHistory.reduce((best, result) => Math.max(best, result.totalScore), resultHistory[0].totalScore)
      : null

  return {
    profileName: activeProfile?.name ?? 'Guest',
    totalSessions: resultHistory.length,
    weakWordCount: data.weakWords.length,
    lastScore,
    bestScore,
    accuracy,
  }
}
