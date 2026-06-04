import { NavLink } from 'react-router-dom'
import { getActiveProfile } from '../utils/profileStorage'

const navItems = [
  { to: '/home', label: 'Home' },
  { to: '/setup', label: 'Practice Setup' },
  { to: '/library', label: 'Word Library' },
  { to: '/weak-words', label: 'Weak Words' },
  { to: '/profile', label: 'Profile' },
]

export function AppHeader() {
  const profile = getActiveProfile()

  return (
    <header className="border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <div>
          <p className="text-xl font-black tracking-tight text-slate-900">IELTS SpellSprint</p>
          <p className="text-xs text-slate-600">
            {profile ? `Profile: ${profile.name}` : 'Choose a profile to begin'}
          </p>
        </div>

        <nav className="flex flex-wrap justify-end gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                  isActive
                    ? 'border-cyan-300 bg-cyan-50 text-cyan-800'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}