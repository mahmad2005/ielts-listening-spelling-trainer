import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { PracticeCard } from '../components/PracticeCard'
import { ScoreBoard } from '../components/ScoreBoard'
import { TimerBar } from '../components/TimerBar'
import type { AnswerRecord, PracticeItem, PracticeResult, PracticeSettings } from '../types'
import { normalizeAnswer } from '../utils/normalizeAnswer'
import { calculatePoints } from '../utils/scoring'
import { saveLatestResult, updateWeakWordProgress } from '../utils/storage'
import { cancelSpeech, speakText } from '../utils/tts'

interface PracticeLocationState {
  settings: PracticeSettings
  items: PracticeItem[]
}

export function Practice() {
  const navigate = useNavigate()
  const location = useLocation()
  const routeState = (location.state as PracticeLocationState | null) ?? null

  const settings = routeState?.settings
  const items = routeState?.items ?? []

  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [score, setScore] = useState(0)
  const [repeatCount, setRepeatCount] = useState(0)
  const [remainingMs, setRemainingMs] = useState(() => (settings?.timeLimitSec ?? 10) * 1000)
  const [feedback, setFeedback] = useState<{
    status: 'correct' | 'wrong' | 'timeout'
    correctWord: string
  } | null>(null)
  const [locked, setLocked] = useState(false)
  const [audioUnlocked, setAudioUnlocked] = useState(false)
  const [audioWarning, setAudioWarning] = useState('')

  const answerRef = useRef('')
  const scoreRef = useRef(0)
  const recordsRef = useRef<AnswerRecord[]>([])
  const repeatCountRef = useRef(0)
  const lockedRef = useRef(false)

  const timerHandles = useRef<number[]>([])
  const tickHandle = useRef<number | null>(null)
  const transitionHandle = useRef<number | null>(null)
  const initialSpeakHandle = useRef<number | null>(null)
  const startedAtRef = useRef(0)

  const totalMs = (settings?.timeLimitSec ?? 10) * 1000
  const currentItem = items[index]

  const getRateForRepeat = useCallback(
    (repeatIndex: number) => {
      if (!settings) {
        return 0.85
      }

      const baseRate = settings.voiceRate
      if (repeatIndex <= 0) {
        return Math.max(0.55, baseRate)
      }

      if (repeatIndex === 1) {
        return Math.max(0.55, baseRate - 0.24)
      }

      return Math.max(0.55, baseRate - 0.36)
    },
    [settings],
  )

  const clearQuestionTimers = useCallback(() => {
    timerHandles.current.forEach((handle) => window.clearTimeout(handle))
    timerHandles.current = []

    if (tickHandle.current !== null) {
      window.clearInterval(tickHandle.current)
      tickHandle.current = null
    }
  }, [])

  const clearTransitionTimer = useCallback(() => {
    if (transitionHandle.current !== null) {
      window.clearTimeout(transitionHandle.current)
      transitionHandle.current = null
    }
  }, [])

  const clearInitialSpeakTimer = useCallback(() => {
    if (initialSpeakHandle.current !== null) {
      window.clearTimeout(initialSpeakHandle.current)
      initialSpeakHandle.current = null
    }
  }, [])

  const moveNext = useCallback(
    (nextRecords: AnswerRecord[], nextScore: number, delayMs: number) => {
      lockedRef.current = true
      setLocked(true)
      clearTransitionTimer()

      transitionHandle.current = window.setTimeout(() => {
        const nextIndex = nextRecords.length
        if (nextIndex >= items.length && settings) {
          const result: PracticeResult = {
            settings,
            records: nextRecords,
            totalScore: nextScore,
            completedAt: new Date().toISOString(),
          }
          saveLatestResult(result)
          navigate('/results', { state: result })
          return
        }

        setIndex(nextIndex)
      }, delayMs)
    },
    [clearTransitionTimer, items.length, navigate, settings],
  )

  const replayCurrentWord = useCallback(
    (repeatIndex = repeatCountRef.current) => {
      if (!currentItem || !settings || lockedRef.current) {
        return Promise.resolve(false)
      }

      return speakText(currentItem.word, {
        voiceURI: settings.voiceURI,
        rate: getRateForRepeat(repeatIndex),
        lang: settings.language,
      })
    },
    [currentItem, getRateForRepeat, settings],
  )

  const finalizeQuestion = useCallback(
    (isCorrect: boolean, status: 'correct' | 'wrong' | 'timeout') => {
      if (!currentItem || !settings || lockedRef.current) {
        return
      }

      clearQuestionTimers()

      const elapsed = Math.min(totalMs, Math.max(0, performance.now() - startedAtRef.current))
      const points = isCorrect ? calculatePoints(repeatCountRef.current) : 0

      const nextRecord: AnswerRecord = {
        section: currentItem.section,
        correctWord: currentItem.word,
        userAnswer: answerRef.current,
        isCorrect,
        result: status,
        timeTakenMs: elapsed,
        repeatCount: repeatCountRef.current,
        pointsEarned: points,
      }

      const nextRecords = [...recordsRef.current, nextRecord]
      const nextScore = scoreRef.current + points

      setFeedback({ status, correctWord: currentItem.word })
      recordsRef.current = nextRecords
      scoreRef.current = nextScore
      setScore(nextScore)
      updateWeakWordProgress(currentItem.section, currentItem.word, status, elapsed)
      cancelSpeech()

      moveNext(nextRecords, nextScore, isCorrect ? 700 : 1300)
    },
    [
      clearQuestionTimers,
      currentItem,
      moveNext,
      settings,
      totalMs,
    ],
  )

  const submitAnswer = useCallback(() => {
    if (!currentItem || !settings || lockedRef.current) {
      return
    }

    const isCorrect = normalizeAnswer(answerRef.current) === normalizeAnswer(currentItem.word)
    finalizeQuestion(isCorrect, isCorrect ? 'correct' : 'wrong')
  }, [currentItem, finalizeQuestion, settings])

  const handleAnswerChange = useCallback((value: string) => {
    answerRef.current = value
    setAnswer(value)
  }, [])

  useEffect(() => {
    if (!settings || items.length === 0) {
      navigate('/setup')
      return
    }

    if (!currentItem) {
      return
    }

    if (!audioUnlocked) {
      clearQuestionTimers()
      clearTransitionTimer()
      clearInitialSpeakTimer()
      cancelSpeech()
      return
    }

    clearTransitionTimer()
    clearQuestionTimers()
    clearInitialSpeakTimer()
    cancelSpeech()
    setAudioWarning('')

    answerRef.current = ''
    setAnswer('')
    setFeedback(null)
    repeatCountRef.current = 0
    setRepeatCount(0)
    lockedRef.current = false
    setLocked(false)
    setRemainingMs(totalMs)
    startedAtRef.current = performance.now()

    initialSpeakHandle.current = window.setTimeout(() => {
      void replayCurrentWord(0).then((started) => {
        if (!started) {
          setAudioWarning('Audio could not start. Please turn off silent mode, increase volume, and tap Test Sound.')
        }
      })
    }, 200)

    const stepMs = totalMs / 3
    timerHandles.current.push(
      window.setTimeout(() => {
        repeatCountRef.current = 1
        setRepeatCount(1)
        replayCurrentWord(1)
      }, stepMs),
    )

    timerHandles.current.push(
      window.setTimeout(() => {
        repeatCountRef.current = 2
        setRepeatCount(2)
        replayCurrentWord(2)
      }, stepMs * 2),
    )

    timerHandles.current.push(
      window.setTimeout(() => {
        finalizeQuestion(false, 'timeout')
      }, totalMs),
    )

    tickHandle.current = window.setInterval(() => {
      const elapsed = performance.now() - startedAtRef.current
      setRemainingMs(Math.max(0, totalMs - elapsed))
    }, 100)

    return () => {
      clearQuestionTimers()
    }
  }, [
    clearQuestionTimers,
    clearTransitionTimer,
    clearInitialSpeakTimer,
    currentItem,
    finalizeQuestion,
    audioUnlocked,
    index,
    items.length,
    navigate,
    replayCurrentWord,
    settings,
    totalMs,
  ])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === 'r') {
        event.preventDefault()
        replayCurrentWord()
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        cancelSpeech()
        navigate('/setup')
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [navigate, replayCurrentWord])

  useEffect(() => {
    return () => {
      clearQuestionTimers()
      clearTransitionTimer()
      clearInitialSpeakTimer()
      cancelSpeech()
    }
  }, [clearInitialSpeakTimer, clearQuestionTimers, clearTransitionTimer])

  const unlockAudio = useCallback(async () => {
    setAudioWarning('')
    cancelSpeech()

    const started = await speakText('Ready', {
      voiceURI: settings?.voiceURI,
      rate: settings?.voiceRate,
      lang: settings?.language,
    })

    if (!started) {
      setAudioWarning('Audio could not start. Please turn off silent mode, increase volume, and tap Test Sound.')
    }

    setAudioUnlocked(true)
  }, [settings])

  const helperText = useMemo(
    () =>
      locked
        ? 'Moving to next question...'
        : 'Enter submits. Ctrl + R replays. Esc exits to setup.',
    [locked],
  )

  if (!settings || items.length === 0 || !currentItem) {
    return null
  }

  if (!audioUnlocked) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-4 py-8">
        <div className="mx-auto w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-2xl shadow-slate-200/70">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-cyan-700">Enable Sound</p>
          <h1 className="text-3xl font-black text-slate-900">Enable Sound</h1>
          <p className="mt-4 text-base text-slate-600">
            Tap the button below to enable IELTS SpellSprint audio on this device.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => {
                void unlockAudio()
              }}
              className="rounded-xl bg-emerald-600 px-6 py-3 text-lg font-bold text-white transition hover:bg-emerald-700"
            >
              Tap to Enable Sound
            </button>
            <button
              type="button"
              onClick={() => {
                void speakText('Sound is working', {
                  voiceURI: settings.voiceURI,
                  rate: settings.voiceRate,
                  lang: settings.language,
                }).then((started) => {
                  if (!started) {
                    setAudioWarning('Audio could not start. Please turn off silent mode, increase volume, and tap Test Sound.')
                  }
                })
              }}
              className="rounded-xl border border-emerald-500 bg-white px-6 py-3 text-lg font-bold text-emerald-700 transition hover:bg-emerald-50"
            >
              Test Sound
            </button>
          </div>
          <p className="mt-4 text-sm text-slate-600">
            On iPhone, sound must be enabled by tapping the button first. Also check Silent Mode and volume.
          </p>
          {audioWarning && <p className="mt-4 text-sm font-semibold text-rose-700">{audioWarning}</p>}
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <h1 className="mb-4 text-3xl font-black text-slate-900">Practice</h1>

      <div className="space-y-4">
        <ScoreBoard
          current={index + 1}
          total={items.length}
          score={score}
          section={currentItem.section}
        />

        <TimerBar totalMs={totalMs} remainingMs={remainingMs} />

        <PracticeCard
          answer={answer}
          onAnswerChange={handleAnswerChange}
          onSubmit={submitAnswer}
          onReplay={replayCurrentWord}
          onTestSound={() => {
            void speakText('Sound is working', {
              voiceURI: settings.voiceURI,
              rate: settings.voiceRate,
              lang: settings.language,
            }).then((started) => {
              if (!started) {
                setAudioWarning('Audio could not start. Please turn off silent mode, increase volume, and tap Test Sound.')
              }
            })
          }}
          repeatsUsed={repeatCount}
          feedback={feedback}
          focusSignal={index}
          disabled={locked}
        />

        <p className="text-sm text-slate-600">{helperText}</p>
        {audioWarning && <p className="text-sm font-semibold text-rose-700">{audioWarning}</p>}
      </div>
    </main>
  )
}
