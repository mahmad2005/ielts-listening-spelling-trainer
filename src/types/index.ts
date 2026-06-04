export type PracticeMode =
  | 'sequential-section'
  | 'random-section'
  | 'random-all'
  | 'weak-only'

export interface WordSection {
  section: string
  words: string[]
}

export interface PracticeSettings {
  mode: PracticeMode
  section: string
  questionCount: number | 'all'
  timeLimitSec: 10 | 15 | 20
  voiceRate: number
  voiceURI: string
  language: string
}

export interface PracticeItem {
  id: string
  section: string
  word: string
}

export interface AnswerRecord {
  section: string
  correctWord: string
  userAnswer: string
  isCorrect: boolean
  result: 'correct' | 'wrong' | 'timeout'
  timeTakenMs: number
  repeatCount: number
  pointsEarned: number
}

export interface WeakWordRecord {
  key: string
  section: string
  word: string
  practiceCount: number
  correctCount: number
  wrongCount: number
  timeoutCount: number
  averageResponseTimeMs: number
  lastPracticedAt: string
  correctStreak: number
  updatedAt: string
}

export type WordStatus = 'new' | 'learning' | 'weak' | 'strong' | 'mastered'

export interface FavouriteWordRecord {
  key: string
  section: string
  word: string
  createdAt: string
}

export interface WordStatRecord {
  key: string
  section: string
  word: string
  practiceCount: number
  correctCount: number
  wrongCount: number
  timeoutCount: number
  currentCorrectStreak: number
  bestCorrectStreak: number
  averageResponseTime: number
  lastPracticedAt: string
  status: WordStatus
}

export interface UserProfile {
  id: string
  name: string
  createdAt: string
  lastActiveAt: string
}

export interface ProfileData {
  settings: PracticeSettings | null
  weakWords: WeakWordRecord[]
  resultHistory: PracticeResult[]
  wordStats: Record<string, WordStatRecord>
  favourites: FavouriteWordRecord[]
}

export interface PracticeResult {
  settings: PracticeSettings
  records: AnswerRecord[]
  totalScore: number
  completedAt: string
}
