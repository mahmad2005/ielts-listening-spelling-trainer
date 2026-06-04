import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { ProfileSwitcher } from '../components/ProfileSwitcher'
import type { PracticeSettings, WordSection } from '../types'
import { getProfileDashboardStats, getSavedSettings, getWeakWords } from '../utils/storage'
import { buildPracticeItems } from '../utils/wordSelector'
import wordsData from '../data/words.json'

const sections = wordsData as WordSection[]

const defaultSettings: PracticeSettings = {
  mode: 'weak-only',
  section: sections[0]?.section ?? '',
  questionCount: 20,
  timeLimitSec: 15,
  voiceRate: 0.85,
  voiceURI: '',
  language: 'en-CA',
}

export function Home() {
  const navigate = useNavigate()
  const totalWords = sections.reduce((total, section) => total + section.words.length, 0)
  const stats = getProfileDashboardStats(totalWords)
  const averageResponseSeconds = stats.averageResponseTimeMs / 1000
  const [reviewError, setReviewError] = useState('')

  const practiceReviewWords = () => {
    const settings: PracticeSettings = {
      ...defaultSettings,
      ...(getSavedSettings() ?? {}),
      mode: 'weak-only',
    }
    const selected = buildPracticeItems(sections, settings, getWeakWords())

    if (selected.length === 0) {
      setReviewError('No review words are scheduled yet. Start a practice session first.')
      return
    }

    setReviewError('')
    navigate('/practice', {
      state: {
        settings,
        items: selected,
      },
    })
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-5xl items-center px-4 py-10">
        <div className="w-full rounded-3xl border border-cyan-100 bg-white/80 p-8 shadow-2xl shadow-cyan-100 backdrop-blur sm:p-10">
        <p className="mb-3 inline-flex rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-700">
          IELTS SpellSprint
        </p>
        <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">
          IELTS Listening Spelling Trainer
        </p>
        <h1 className="max-w-2xl text-4xl font-black leading-tight text-slate-900 sm:text-5xl">
          Hear It. Spell It. Score Better.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-slate-600">
          Practice common IELTS Listening words with timed spelling dictation. Hear a word, type it correctly before time runs out, and improve your weak words through smart repetition.
        </p>

        <div className="mt-8">
          <ProfileSwitcher profileName={stats.profileName} />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Total Words" value={`${stats.totalWords}`} accent="slate" />
          <MetricCard title="Practiced Words" value={`${stats.practicedWords}`} accent="cyan" />
          <MetricCard title="New Words" value={`${stats.newWords}`} accent="emerald" />
          <MetricCard title="Currently Weak" value={`${stats.weakWords}`} accent="amber" />
          <MetricCard title="Strong Words" value={`${stats.strongWords}`} accent="emerald" />
          <MetricCard title="Mastered Words" value={`${stats.masteredWords}`} accent="cyan" />
          <MetricCard title="Accuracy" value={`${stats.accuracy.toFixed(1)}%`} accent="rose" />
          <MetricCard title="Average Response Time" value={`${averageResponseSeconds.toFixed(2)}s`} accent="slate" />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard title="Profile" value={stats.profileName} accent="cyan" />
          <MetricCard title="Total Sessions" value={`${stats.totalSessions}`} accent="slate" />
          <MetricCard title="Correct At Least Once" value={`${stats.correctAtLeastOnce}`} accent="emerald" />
          <MetricCard
            title="Last Score"
            value={stats.lastScore === null ? 'No sessions yet' : `${stats.lastScore}`}
            accent="emerald"
          />
          <MetricCard
            title="Best Score"
            value={stats.bestScore === null ? 'No sessions yet' : `${stats.bestScore}`}
            accent="cyan"
          />
          <MetricCard title="Words Due for Review" value={`${stats.weakReviewQueueCount}`} accent="amber" />
        </div>

        <div className="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50/80 px-4 py-3 text-sm text-cyan-900">
          <p>
            <span className="font-semibold">Currently Weak:</span> words with weak status caused by wrong answers, timeout, or low accuracy.
          </p>
          <p>
            <span className="font-semibold">Words Due for Review:</span> all words currently scheduled for weak-word or revision practice.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            to="/setup"
            className="rounded-xl bg-slate-900 px-6 py-3 text-lg font-semibold text-white transition hover:bg-slate-800"
          >
            Start Practice
          </Link>
          <Link
            to="/library"
            className="rounded-xl border border-emerald-300 bg-emerald-50 px-6 py-3 text-lg font-semibold text-emerald-800 transition hover:border-emerald-400"
          >
            Word Library
          </Link>
          <Link
            to="/weak-words"
            className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-lg font-semibold text-slate-700 transition hover:border-cyan-400 hover:text-cyan-700"
          >
            View Weak Words
          </Link>
          <button
            type="button"
            onClick={practiceReviewWords}
            className="rounded-xl border border-amber-300 bg-amber-50 px-6 py-3 text-lg font-semibold text-amber-900 transition hover:border-amber-400"
          >
            Practice Review Words
          </button>
        </div>
        {reviewError && <p className="mt-3 text-sm font-semibold text-rose-700">{reviewError}</p>}

        <section className="mt-10">
          <h2 className="text-2xl font-black text-slate-900">How it works</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <HowItWorksCard
              title="Listen"
              description="The app speaks a common IELTS Listening word or phrase."
              accent="cyan"
            />
            <HowItWorksCard
              title="Type"
              description="Type the correct spelling before the timer ends."
              accent="emerald"
            />
            <HowItWorksCard
              title="Improve"
              description="Wrong and slow words are saved as weak words for revision."
              accent="amber"
            />
          </div>
        </section>
        </div>
      </main>
    </>
  )
}

interface MetricCardProps {
  title: string
  value: string
  accent: 'slate' | 'cyan' | 'amber' | 'emerald' | 'rose'
}

function MetricCard({ title, value, accent }: MetricCardProps) {
  const accentClassName = {
    slate: 'border-slate-200 bg-slate-50 text-slate-900',
    cyan: 'border-cyan-200 bg-cyan-50 text-cyan-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    rose: 'border-rose-200 bg-rose-50 text-rose-900',
  }[accent]

  return (
    <div className={`rounded-2xl border p-4 ${accentClassName}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-75">{title}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  )
}

interface HowItWorksCardProps {
  title: string
  description: string
  accent: 'cyan' | 'emerald' | 'amber'
}

function HowItWorksCard({ title, description, accent }: HowItWorksCardProps) {
  const accentClassName = {
    cyan: 'border-cyan-200 bg-cyan-50/70',
    emerald: 'border-emerald-200 bg-emerald-50/70',
    amber: 'border-amber-200 bg-amber-50/70',
  }[accent]

  return (
    <article className={`rounded-2xl border p-5 ${accentClassName}`}>
      <h3 className="text-lg font-black text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-700">{description}</p>
    </article>
  )
}
