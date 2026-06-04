import { Link } from 'react-router-dom'
import { ProfileSwitcher } from '../components/ProfileSwitcher'
import { getProfileDashboardStats } from '../utils/storage'

export function Home() {
  const stats = getProfileDashboardStats()

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-10">
      <div className="w-full rounded-3xl border border-cyan-100 bg-white/80 p-8 shadow-2xl shadow-cyan-100 backdrop-blur sm:p-10">
        <p className="mb-3 inline-flex rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-700">
          IELTS Listening Spelling Practice
        </p>
        <h1 className="max-w-2xl text-4xl font-black leading-tight text-slate-900 sm:text-5xl">
          Hear It. Spell It. Score Better.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-slate-600">
          Practice high-frequency IELTS listening words with real-time text-to-speech, strict spelling checks, timer-based scoring, and weak-word revision.
        </p>

        <div className="mt-8">
          <ProfileSwitcher profileName={stats.profileName} />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard title="Profile" value={stats.profileName} accent="cyan" />
          <MetricCard title="Total sessions" value={`${stats.totalSessions}`} accent="slate" />
          <MetricCard title="Weak words" value={`${stats.weakWordCount}`} accent="amber" />
          <MetricCard
            title="Last score"
            value={stats.lastScore === null ? 'No sessions yet' : `${stats.lastScore}`}
            accent="emerald"
          />
          <MetricCard
            title="Best score"
            value={stats.bestScore === null ? 'No sessions yet' : `${stats.bestScore}`}
            accent="cyan"
          />
          <MetricCard title="Accuracy" value={`${stats.accuracy.toFixed(1)}%`} accent="rose" />
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
            to="/setup"
            state={{ presetMode: 'weak-only' }}
            className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-lg font-semibold text-slate-700 transition hover:border-cyan-400 hover:text-cyan-700"
          >
            Weak Words ({stats.weakWordCount})
          </Link>
        </div>
      </div>
    </main>
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
