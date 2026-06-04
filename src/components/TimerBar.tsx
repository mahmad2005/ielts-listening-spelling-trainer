interface TimerBarProps {
  totalMs: number
  remainingMs: number
}

export function TimerBar({ totalMs, remainingMs }: TimerBarProps) {
  const ratio = totalMs > 0 ? Math.max(0, Math.min(1, remainingMs / totalMs)) : 0
  const percentage = Math.round(ratio * 100)

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm font-medium text-slate-700">
        <span>Time left</span>
        <span className="text-lg font-bold text-slate-900">{(remainingMs / 1000).toFixed(1)}s</span>
      </div>
      <div className="h-4 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-emerald-500 to-lime-500 transition-all duration-100"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
