import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import type { PracticeItem, PracticeSettings, WeakWordRecord, WordStatus } from '../types'
import {
  getSavedSettings,
  getWeakWords,
  getWordStatsMap,
  makeWeakWordKey,
  removeWeakWord,
  resetWordProgress,
} from '../utils/storage'
import { speakText } from '../utils/tts'

type WeakFilter = 'all-review' | 'weak' | 'learning' | 'strong' | 'mastered' | 'due'

interface ReviewWordRow {
  key: string
  word: string
  section: string
  status: WordStatus
  practiceCount: number
  correctCount: number
  wrongCount: number
  timeoutCount: number
  currentCorrectStreak: number
  averageResponseTimeMs: number
  lastPracticedAt: string
}

const defaultPracticeSettings: PracticeSettings = {
  mode: 'weak-only',
  section: '',
  questionCount: 20,
  timeLimitSec: 15,
  voiceRate: 0.85,
  voiceURI: '',
  language: 'en-CA',
}

function deriveStatus(record: WeakWordRecord): WordStatus {
  if (record.practiceCount <= 0) {
    return 'new'
  }

  const accuracy = record.correctCount / Math.max(1, record.practiceCount)

  if (record.correctStreak >= 3 && record.averageResponseTimeMs < 5000) {
    return 'mastered'
  }

  if (record.correctStreak >= 2) {
    return 'strong'
  }

  if (record.wrongCount > 0 || record.timeoutCount > 0 || accuracy < 0.7) {
    return 'weak'
  }

  return 'learning'
}

function buildRows(): ReviewWordRow[] {
  const weakWords = getWeakWords()
  const statsMap = getWordStatsMap()

  return weakWords
    .map((record) => {
      const stat = statsMap[record.key]
      const status = stat?.status ?? deriveStatus(record)

      return {
        key: record.key,
        word: record.word,
        section: record.section,
        status,
        practiceCount: stat?.practiceCount ?? record.practiceCount,
        correctCount: stat?.correctCount ?? record.correctCount,
        wrongCount: stat?.wrongCount ?? record.wrongCount,
        timeoutCount: stat?.timeoutCount ?? record.timeoutCount,
        currentCorrectStreak: stat?.currentCorrectStreak ?? record.correctStreak,
        averageResponseTimeMs: stat?.averageResponseTime ?? record.averageResponseTimeMs,
        lastPracticedAt: stat?.lastPracticedAt ?? record.lastPracticedAt,
      }
    })
    .sort((left, right) => left.word.localeCompare(right.word))
}

function statusLabel(status: WordStatus): string {
  return status.slice(0, 1).toUpperCase() + status.slice(1)
}

function statusBadgeClassName(status: WordStatus): string {
  return {
    new: 'bg-slate-100 text-slate-700',
    learning: 'bg-cyan-100 text-cyan-800',
    weak: 'bg-rose-100 text-rose-800',
    strong: 'bg-emerald-100 text-emerald-800',
    mastered: 'bg-indigo-100 text-indigo-800',
  }[status]
}

function formatDate(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return 'Never'
  }

  return parsed.toLocaleString()
}

export function WeakWords() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<WeakFilter>('all-review')
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<ReviewWordRow[]>(() => buildRows())

  const savedSettings = getSavedSettings()
  const speechSettings = {
    voiceURI: savedSettings?.voiceURI ?? defaultPracticeSettings.voiceURI,
    voiceRate: savedSettings?.voiceRate ?? defaultPracticeSettings.voiceRate,
    language: savedSettings?.language ?? defaultPracticeSettings.language,
  }

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()

    return rows.filter((row) => {
      if (filter === 'weak' && row.status !== 'weak') {
        return false
      }

      if (filter === 'learning' && row.status !== 'learning') {
        return false
      }

      if (filter === 'strong' && row.status !== 'strong') {
        return false
      }

      if (filter === 'mastered' && row.status !== 'mastered') {
        return false
      }

      if (!query) {
        return true
      }

      return row.word.toLowerCase().includes(query) || row.section.toLowerCase().includes(query)
    })
  }, [filter, rows, search])

  const refreshRows = () => {
    setRows(buildRows())
  }

  const startSingleWordPractice = (row: ReviewWordRow) => {
    const settings: PracticeSettings = {
      ...defaultPracticeSettings,
      ...(savedSettings ?? {}),
      mode: 'weak-only',
      section: row.section,
      questionCount: 1,
    }

    const item: PracticeItem = {
      id: makeWeakWordKey(row.section, row.word),
      section: row.section,
      word: row.word,
    }

    navigate('/practice', {
      state: {
        settings,
        items: [item],
      },
    })
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-7xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-black text-slate-900">Weak Words</h1>
          <p className="mt-2 text-sm text-slate-600">
            Currently Weak means words with weak status due to wrong answers, timeouts, or low accuracy. Words Due for Review means all words currently scheduled for weak-word/revision practice.
          </p>
        </div>

        <div className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[220px,1fr]">
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value as WeakFilter)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-800 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-300"
          >
            <option value="all-review">All review words</option>
            <option value="weak">Weak only</option>
            <option value="learning">Learning</option>
            <option value="strong">Strong</option>
            <option value="mastered">Mastered</option>
            <option value="due">Due for review</option>
          </select>

          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by word or section"
            className="rounded-xl border border-slate-300 px-4 py-3 text-slate-800 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-300"
          />
        </div>

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-emerald-300 bg-emerald-50 p-6 text-center">
            <p className="text-lg font-semibold text-emerald-900">
              Great job! You have no weak words yet. Start a practice session to build your review list.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-3 py-2">Word</th>
                    <th className="px-3 py-2">Section</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Practice count</th>
                    <th className="px-3 py-2">Correct count</th>
                    <th className="px-3 py-2">Wrong count</th>
                    <th className="px-3 py-2">Timeout count</th>
                    <th className="px-3 py-2">Current correct streak</th>
                    <th className="px-3 py-2">Average response time</th>
                    <th className="px-3 py-2">Last practiced date</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.key} className="border-t border-slate-200">
                      <td className="px-3 py-2 font-semibold text-slate-900">{row.word}</td>
                      <td className="px-3 py-2">{row.section}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClassName(row.status)}`}>
                          {statusLabel(row.status)}
                        </span>
                      </td>
                      <td className="px-3 py-2">{row.practiceCount}</td>
                      <td className="px-3 py-2">{row.correctCount}</td>
                      <td className="px-3 py-2">{row.wrongCount}</td>
                      <td className="px-3 py-2">{row.timeoutCount}</td>
                      <td className="px-3 py-2">{row.currentCorrectStreak}</td>
                      <td className="px-3 py-2">{(row.averageResponseTimeMs / 1000).toFixed(2)}s</td>
                      <td className="px-3 py-2">{formatDate(row.lastPracticedAt)}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              void speakText(row.word, {
                                voiceURI: speechSettings.voiceURI,
                                rate: speechSettings.voiceRate,
                                lang: speechSettings.language,
                              })
                            }}
                            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
                          >
                            Listen
                          </button>

                          <button
                            type="button"
                            onClick={() => startSingleWordPractice(row)}
                            className="rounded-md bg-cyan-100 px-2 py-1 text-xs font-semibold text-cyan-800 transition hover:bg-cyan-200"
                          >
                            Practice this word
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              removeWeakWord(row.section, row.word)
                              refreshRows()
                            }}
                            className="rounded-md bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-800 transition hover:bg-rose-200"
                          >
                            Remove from weak list
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              resetWordProgress(row.section, row.word)
                              refreshRows()
                            }}
                            className="rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800 transition hover:bg-amber-200"
                          >
                            Reset stats
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </>
  )
}