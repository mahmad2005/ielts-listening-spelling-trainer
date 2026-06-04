import type { PracticeMode } from '../types'

interface ModeSelectorProps {
  value: PracticeMode
  onChange: (mode: PracticeMode) => void
}

const options: Array<{ value: PracticeMode; label: string; description: string }> = [
  {
    value: 'sequential-section',
    label: 'Sequential from selected section',
    description: 'Practice in listed order from one section.',
  },
  {
    value: 'random-section',
    label: 'Random from selected section',
    description: 'Shuffle only the selected section.',
  },
  {
    value: 'random-all',
    label: 'Random from all sections',
    description: 'Mix words from all sections.',
  },
  {
    value: 'weak-only',
    label: 'Weak words only',
    description: 'Practice words you missed before.',
  },
]

export function ModeSelector({ value, onChange }: ModeSelectorProps) {
  return (
    <div className="space-y-3">
      {options.map((option) => (
        <label
          key={option.value}
          className={`block cursor-pointer rounded-xl border p-4 transition ${
            value === option.value
              ? 'border-cyan-500 bg-cyan-50 ring-1 ring-cyan-500'
              : 'border-slate-200 bg-white hover:border-cyan-300'
          }`}
        >
          <div className="flex items-start gap-3">
            <input
              type="radio"
              name="practice-mode"
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="mt-1"
            />
            <div>
              <p className="text-sm font-semibold text-slate-800">{option.label}</p>
              <p className="text-sm text-slate-500">{option.description}</p>
            </div>
          </div>
        </label>
      ))}
    </div>
  )
}
