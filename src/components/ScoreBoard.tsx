interface ScoreBoardProps {
  current: number
  total: number
  score: number
  section: string
}

export function ScoreBoard({ current, total, score, section }: ScoreBoardProps) {
  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm sm:grid-cols-3">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500">Question</p>
        <p className="text-2xl font-bold text-slate-900">
          {current}/{total}
        </p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500">Section</p>
        <p className="text-lg font-semibold text-slate-900">{section}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500">Score</p>
        <p className="text-2xl font-bold text-slate-900">{score}</p>
      </div>
    </div>
  )
}
