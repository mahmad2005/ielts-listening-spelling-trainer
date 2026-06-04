import { useEffect, useRef } from 'react'
import type { FormEvent } from 'react'

interface PracticeCardProps {
  answer: string
  onAnswerChange: (value: string) => void
  onSubmit: () => void
  onReplay: () => void
  onTestSound: () => void
  repeatsUsed: number
  feedback: { status: 'correct' | 'wrong' | 'timeout'; correctWord: string } | null
  focusSignal: number
  disabled?: boolean
}

export function PracticeCard({
  answer,
  onAnswerChange,
  onSubmit,
  onReplay,
  onTestSound,
  repeatsUsed,
  feedback,
  focusSignal,
  disabled,
}: PracticeCardProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!disabled) {
      inputRef.current?.focus()
    }
  }, [disabled, focusSignal])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/70">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-slate-600">Auto repeats used: {repeatsUsed}/2</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onTestSound}
              className="rounded-lg border border-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
            >
              Test Sound
            </button>
            <button
              type="button"
              onClick={onReplay}
              disabled={disabled}
              className="rounded-lg border border-cyan-500 px-4 py-2 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Replay (Ctrl + R)
            </button>
          </div>
        </div>

        <input
          ref={inputRef}
          value={answer}
          onChange={(event) => onAnswerChange(event.target.value)}
          placeholder="Type exactly what you hear..."
          disabled={disabled}
          className="w-full rounded-xl border-2 border-slate-300 px-5 py-4 text-2xl font-semibold tracking-wide text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-100"
        />

        <button
          type="submit"
          disabled={disabled}
          className="w-full rounded-xl bg-slate-900 px-5 py-3 text-lg font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Submit (Enter)
        </button>
      </form>

      {feedback && (
        <div
          className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
            feedback.status === 'correct'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
              : 'border-rose-300 bg-rose-50 text-rose-800'
          }`}
        >
          {feedback.status === 'correct'
            ? 'Correct answer.'
            : `Correct word: ${feedback.correctWord}`}
        </div>
      )}
    </div>
  )
}
