import { Link } from 'react-router-dom'
import { getWeakWords } from '../utils/storage'

export function Home() {
  const weakCount = getWeakWords().length

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
            Weak Words ({weakCount})
          </Link>
        </div>
      </div>
    </main>
  )
}
