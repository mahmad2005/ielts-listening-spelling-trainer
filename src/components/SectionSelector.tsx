import type { WordSection } from '../types'

interface SectionSelectorProps {
  value: string
  sections: WordSection[]
  disabled?: boolean
  onChange: (section: string) => void
}

export function SectionSelector({ value, sections, disabled, onChange }: SectionSelectorProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">Section</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 shadow-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-100"
      >
        {sections.map((section) => (
          <option key={section.section} value={section.section}>
            {section.section}
          </option>
        ))}
      </select>
    </label>
  )
}
