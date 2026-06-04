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

  const answerRef = useRef('')
  const scoreRef = useRef(0)
  const recordsRef = useRef<AnswerRecord[]>([])
  const repeatCountRef = useRef(0)
  const lockedRef = useRef(false)

  const timerHandles = useRef<number[]>([])
  const tickHandle = useRef<number | null>(null)
  const transitionHandle = useRef<number | null>(null)
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
        return
      }

      speakText(currentItem.word, {
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

    clearTransitionTimer()
    clearQuestionTimers()
    cancelSpeech()

    answerRef.current = ''
    setAnswer('')
    setFeedback(null)
    repeatCountRef.current = 0
    setRepeatCount(0)
    lockedRef.current = false
    setLocked(false)
    setRemainingMs(totalMs)
    startedAtRef.current = performance.now()

    replayCurrentWord(0)

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
    currentItem,
    finalizeQuestion,
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
      cancelSpeech()
    }
  }, [clearQuestionTimers, clearTransitionTimer])

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
          repeatsUsed={repeatCount}
          feedback={feedback}
          focusSignal={index}
          disabled={locked}
        />

        <p className="text-sm text-slate-600">{helperText}</p>
      </div>
    </main>
  )
}
