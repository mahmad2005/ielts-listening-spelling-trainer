import { normalizeAnswer } from './normalizeAnswer'
import type {
  FavouriteWordRecord,
  ProfileData,
  PracticeResult,
  PracticeSettings,
  WeakWordRecord,
  WordStatus,
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

function toNumber(value: unknown, fallback = 0): number {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) {
    return fallback
  }

  return numeric
}

function resolveWordStatus(stat: Pick<WordStatRecord, 'practiceCount' | 'correctCount' | 'wrongCount' | 'timeoutCount' | 'currentCorrectStreak' | 'averageResponseTime'>): WordStatus {
  if (stat.practiceCount <= 0) {
    return 'new'
  }

  const accuracy = stat.correctCount / Math.max(1, stat.practiceCount)

  if (stat.currentCorrectStreak >= 3 && stat.averageResponseTime < 5000) {
    return 'mastered'
  }

  if (stat.currentCorrectStreak >= 2) {
    return 'strong'
  }

  if (stat.wrongCount > 0 || stat.timeoutCount > 0 || accuracy < 0.7) {
    return 'weak'
  }

  return 'learning'
}

function toWordStatRecord(
  record: Partial<WordStatRecord> & {
    key?: string
    section?: string
    word?: string
    attempts?: number
    correctStreak?: number
    averageResponseTimeMs?: number
  },
): WordStatRecord {
  const practiceCount = Math.max(
    0,
    toNumber(record.practiceCount, toNumber(record.attempts, 0)),
  )
  const correctCount = Math.max(0, toNumber(record.correctCount, 0))
  const wrongCount = Math.max(0, toNumber(record.wrongCount, 0))
  const timeoutCount = Math.max(0, toNumber(record.timeoutCount, 0))
  const currentCorrectStreak = Math.max(
    0,
    toNumber(record.currentCorrectStreak, toNumber(record.correctStreak, 0)),
  )
  const bestCorrectStreak = Math.max(
    currentCorrectStreak,
    Math.max(0, toNumber(record.bestCorrectStreak, currentCorrectStreak)),
  )
  const averageResponseTime = Math.max(
    0,
    toNumber(record.averageResponseTime, toNumber(record.averageResponseTimeMs, 0)),
  )

  const normalized: WordStatRecord = {
    key: record.key ?? '',
    section: record.section ?? 'Unknown',
    word: record.word ?? 'Unknown',
    practiceCount,
    correctCount,
    wrongCount,
    timeoutCount,
    currentCorrectStreak,
    bestCorrectStreak,
    averageResponseTime,
    lastPracticedAt: record.lastPracticedAt ?? new Date().toISOString(),
    status: 'learning',
  }

  normalized.status =
    record.status && ['new', 'learning', 'weak', 'strong', 'mastered'].includes(record.status)
      ? record.status
      : resolveWordStatus(normalized)

  return normalized
}

function normalizeWordStats(currentStats: Record<string, WordStatRecord>): Record<string, WordStatRecord> {
  return Object.entries(currentStats).reduce<Record<string, WordStatRecord>>((acc, [key, value]) => {
    if (!value || typeof value !== 'object') {
      return acc
    }

    const normalized = toWordStatRecord({
      ...value,
      key: value.key ?? key,
    })

    acc[normalized.key || key] = {
      ...normalized,
      key: normalized.key || key,
    }

    return acc
  }, {})
}

function buildWordStats(records: PracticeResult['records'], currentStats: Record<string, WordStatRecord>): Record<string, WordStatRecord> {
  const nextStats = normalizeWordStats(currentStats)
  const practicedAt = new Date().toISOString()

  records.forEach((record) => {
    const key = makeWeakWordKey(record.section, record.correctWord)
    const existing =
      nextStats[key] ??
      toWordStatRecord({
        key,
        section: record.section,
        word: record.correctWord,
        practiceCount: 0,
        correctCount: 0,
        wrongCount: 0,
        timeoutCount: 0,
        currentCorrectStreak: 0,
        bestCorrectStreak: 0,
        averageResponseTime: 0,
        lastPracticedAt: practicedAt,
      })

    const nextPracticeCount = existing.practiceCount + 1
    const responseTime = Math.max(0, record.timeTakenMs)
    const averageResponseTime =
      nextPracticeCount <= 1
        ? responseTime
        : (existing.averageResponseTime * existing.practiceCount + responseTime) / nextPracticeCount
    const currentCorrectStreak = record.result === 'correct' ? existing.currentCorrectStreak + 1 : 0
    const bestCorrectStreak = Math.max(existing.bestCorrectStreak, currentCorrectStreak)

    const nextRecord: WordStatRecord = {
      ...existing,
      section: record.section,
      word: record.correctWord,
      practiceCount: nextPracticeCount,
      correctCount: existing.correctCount + (record.result === 'correct' ? 1 : 0),
      wrongCount: existing.wrongCount + (record.result === 'wrong' ? 1 : 0),
      timeoutCount: existing.timeoutCount + (record.result === 'timeout' ? 1 : 0),
      currentCorrectStreak,
      bestCorrectStreak,
      averageResponseTime,
      lastPracticedAt: practicedAt,
      status: 'learning',
    }

    nextRecord.status = resolveWordStatus(nextRecord)
    nextStats[key] = nextRecord
  })

  return nextStats
}

export interface ProfileDashboardStats {
  profileName: string
  totalWords: number
  practicedWords: number
  newWords: number
  correctAtLeastOnce: number
  totalSessions: number
  weakReviewQueueCount: number
  weakWords: number
  strongWords: number
  masteredWords: number
  lastScore: number | null
  bestScore: number | null
  accuracy: number
  averageResponseTimeMs: number
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

export function getWordStatsMap(): Record<string, WordStatRecord> {
  return normalizeWordStats(getActiveProfileData().wordStats)
}

export function getProfileDashboardStats(totalWords: number): ProfileDashboardStats {
  const activeProfile = getActiveProfile()
  const data = getActiveProfileData()
  const wordStats = normalizeWordStats(data.wordStats)
  const wordStatsList = Object.values(wordStats)
  const resultHistory = data.resultHistory
  const allRecords = resultHistory.flatMap((result) => result.records)
  const correctCount = allRecords.filter((record) => record.result === 'correct').length
  const accuracy = allRecords.length > 0 ? (correctCount / allRecords.length) * 100 : 0
  const averageResponseTimeMs =
    allRecords.length > 0
      ? allRecords.reduce((total, record) => total + Math.max(0, record.timeTakenMs), 0) / allRecords.length
      : 0
  const lastScore = resultHistory.at(-1)?.totalScore ?? null
  const bestScore =
    resultHistory.length > 0
      ? resultHistory.reduce((best, result) => Math.max(best, result.totalScore), resultHistory[0].totalScore)
      : null

  const practicedWords = wordStatsList.filter((record) => record.practiceCount > 0).length
  const correctAtLeastOnce = wordStatsList.filter((record) => record.correctCount > 0).length
  const weakWords = wordStatsList.filter((record) => record.status === 'weak').length
  const strongWords = wordStatsList.filter((record) => record.status === 'strong').length
  const masteredWords = wordStatsList.filter((record) => record.status === 'mastered').length
  const boundedTotalWords = Math.max(0, totalWords)
  const newWords = Math.max(0, boundedTotalWords - practicedWords)

  return {
    profileName: activeProfile?.name ?? 'Guest',
    totalWords: boundedTotalWords,
    practicedWords,
    newWords,
    correctAtLeastOnce,
    totalSessions: resultHistory.length,
    weakReviewQueueCount: data.weakWords.length,
    weakWords,
    strongWords,
    masteredWords,
    lastScore,
    bestScore,
    accuracy,
    averageResponseTimeMs,
  }
}
