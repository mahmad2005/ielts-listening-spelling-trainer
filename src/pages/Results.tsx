import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ResultTable } from '../components/ResultTable'
import type { PracticeResult } from '../types'
import { getLatestResult } from '../utils/storage'

type ResultKind = 'correct' | 'wrong' | 'timeout'

function resolveResultKind(record: PracticeResult['records'][number]): ResultKind {
  return record.result ?? (record.isCorrect ? 'correct' : 'wrong')
}

export function Results() {
  const navigate = useNavigate()
  const location = useLocation()
  const stateResult = (location.state as PracticeResult | null) ?? null
  const result = stateResult ?? getLatestResult()

  if (!result) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-slate-700">No results available yet.</p>
          <Link to="/setup" className="mt-4 inline-block text-cyan-700 hover:text-cyan-900">
            Start a practice session
          </Link>
        </div>
      </main>
    )
  }

  const totalQuestions = result.records.length
  const correctCount = result.records.filter((record) => resolveResultKind(record) === 'correct').length
  const wrongCount = result.records.filter((record) => resolveResultKind(record) === 'wrong').length
  const timeoutCount = result.records.filter((record) => resolveResultKind(record) === 'timeout').length
  const averageTimeMs =
    totalQuestions > 0
      ? result.records.reduce((total, record) => total + record.timeTakenMs, 0) / totalQuestions
      : 0
  const accuracy = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0

  const weakestSections = Object.entries(
    result.records.reduce<Record<string, { missed: number; total: number }>>((acc, record) => {
      if (!acc[record.section]) {
        acc[record.section] = { missed: 0, total: 0 }
      }

      acc[record.section].total += 1
      if (resolveResultKind(record) !== 'correct') {
        acc[record.section].missed += 1
      }

      return acc
    }, {}),
  )
    .map(([section, stats]) => ({
      section,
      missed: stats.missed,
      total: stats.total,
      missRate: stats.total > 0 ? (stats.missed / stats.total) * 100 : 0,
    }))
    .filter((item) => item.missed > 0)
    .sort((left, right) => right.missRate - left.missRate || right.missed - left.missed)
    .slice(0, 5)

  const mostMissedWords = Object.entries(
    result.records.reduce<Record<string, { section: string; missed: number }>>((acc, record) => {
      const key = `${record.section}::${record.correctWord}`
      if (!acc[key]) {
        acc[key] = { section: record.section, missed: 0 }
      }

      if (resolveResultKind(record) !== 'correct') {
        acc[key].missed += 1
      }

      return acc
    }, {}),
  )
    .map(([key, value]) => ({
      key,
      section: value.section,
      word: key.split('::')[1],
      missed: value.missed,
    }))
    .filter((item) => item.missed > 0)
    .sort((left, right) => right.missed - left.missed)
    .slice(0, 8)

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <h1 className="mb-5 text-3xl font-black text-slate-900">Results</h1>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <MetricCard title="Total score" value={`${result.totalScore}`} />
        <MetricCard title="Correct" value={`${correctCount}`} />
        <MetricCard title="Wrong" value={`${wrongCount}`} />
        <MetricCard title="Timeout" value={`${timeoutCount}`} />
        <MetricCard title="Avg response" value={`${(averageTimeMs / 1000).toFixed(2)}s`} />
        <MetricCard title="Accuracy" value={`${accuracy.toFixed(1)}%`} />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Weakest sections</h2>
          {weakestSections.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">No weak sections in this session.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {weakestSections.map((item) => (
                <li key={item.section} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <span className="font-semibold text-slate-800">{item.section}</span>
                  <span className="text-slate-600">
                    {item.missed}/{item.total} missed ({item.missRate.toFixed(0)}%)
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Most missed words</h2>
          {mostMissedWords.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">No missed words in this session.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {mostMissedWords.map((item) => (
                <li key={item.key} className="flex items-center justify-between rounded-lg bg-rose-50 px-3 py-2">
                  <span>
                    <span className="font-semibold text-slate-900">{item.word}</span>
                    <span className="ml-2 text-slate-600">({item.section})</span>
                  </span>
                  <span className="font-semibold text-rose-700">{item.missed} misses</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <ResultTable records={result.records} settings={result.settings} />

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => navigate('/setup', { state: { presetMode: 'weak-only' } })}
          className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-900 transition hover:bg-amber-400"
        >
          Practice wrong words again
        </button>

        <Link
          to="/setup"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 transition hover:border-slate-500"
        >
          Restart
        </Link>

        <Link
          to="/library"
          className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 font-semibold text-emerald-800 transition hover:border-emerald-400"
        >
          Word library
        </Link>

        <Link
          to="/"
          className="rounded-lg border border-cyan-300 bg-cyan-50 px-4 py-2 font-semibold text-cyan-800 transition hover:border-cyan-400"
        >
          Home
        </Link>
      </div>
    </main>
  )
}

interface MetricCardProps {
  title: string
  value: string
}

function MetricCard({ title, value }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
      <p className="text-2xl font-black text-slate-900">{value}</p>
    </div>
  )
}
