import { Link } from 'react-router-dom'

interface ProfileSwitcherProps {
  profileName: string
}

export function ProfileSwitcher({ profileName }: ProfileSwitcherProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active profile</p>
        <p className="text-lg font-bold text-slate-900">{profileName}</p>
      </div>

      <Link
        to="/profile"
        className="ml-auto rounded-xl border border-cyan-300 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-800 transition hover:border-cyan-400"
      >
        Switch Profile
      </Link>
    </div>
  )
}