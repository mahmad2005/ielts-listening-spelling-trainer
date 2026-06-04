import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { UserProfile } from '../types'
import {
  createProfile,
  deleteProfile,
  getActiveProfileId,
  getProfiles,
  renameProfile,
  setActiveProfile,
} from '../utils/profileStorage'

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString()
}

export function ProfileSelect() {
  const navigate = useNavigate()
  const [profiles, setProfiles] = useState<UserProfile[]>(() => getProfiles())
  const [newProfileName, setNewProfileName] = useState('')
  const [renameDraft, setRenameDraft] = useState<Record<string, string>>({})
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const activeProfileId = useMemo(() => getActiveProfileId(), [profiles])

  const refreshProfiles = () => {
    setProfiles(getProfiles())
  }

  const handleCreateProfile = () => {
    const profile = createProfile(newProfileName)

    if (!profile) {
      setError('Enter a profile name to continue.')
      return
    }

    setError('')
    setNewProfileName('')
    refreshProfiles()
    navigate('/home')
  }

  const handleSelectProfile = (profileId: string) => {
    setActiveProfile(profileId)
    refreshProfiles()
    navigate('/home')
  }

  const handleRenameProfile = (profileId: string) => {
    const nextName = renameDraft[profileId] ?? ''
    const updated = renameProfile(profileId, nextName)

    if (!updated) {
      setError('Profile name cannot be empty.')
      return
    }

    setError('')
    setEditingProfileId(null)
    refreshProfiles()
  }

  const handleDeleteProfile = (profile: UserProfile) => {
    if (!window.confirm(`Delete profile "${profile.name}" and all its local progress?`)) {
      return
    }

    deleteProfile(profile.id)
    setError('')
    if (editingProfileId === profile.id) {
      setEditingProfileId(null)
    }
    refreshProfiles()
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-10">
      <div className="grid w-full gap-6 lg:grid-cols-[0.92fr,1.08fr]">
        <section className="rounded-3xl border border-cyan-100 bg-white/80 p-8 shadow-2xl shadow-cyan-100 backdrop-blur sm:p-10">
          <p className="mb-3 inline-flex rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-700">
            Local User Profiles
          </p>
          <h1 className="text-4xl font-black leading-tight text-slate-900 sm:text-5xl">
            Choose who is practicing today.
          </h1>
          <p className="mt-5 text-lg text-slate-600">
            Each profile keeps its own settings, weak words, favourites, and results locally in your browser.
          </p>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <label className="mb-2 block text-sm font-semibold text-slate-700">Create profile</label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={newProfileName}
                onChange={(event) => setNewProfileName(event.target.value)}
                placeholder="Enter profile name"
                className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-slate-800 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-300"
              />
              <button
                type="button"
                onClick={handleCreateProfile}
                className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-800"
              >
                Create Profile
              </button>
            </div>
            {error && <p className="mt-3 text-sm font-semibold text-rose-700">{error}</p>}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Existing profiles</h2>
              <p className="text-sm text-slate-600">Select, rename, or delete a local profile.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
              {profiles.length} total
            </span>
          </div>

          {profiles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
              No profiles yet. Create one to start practicing.
            </div>
          ) : (
            <div className="space-y-3">
              {profiles.map((profile) => {
                const isEditing = editingProfileId === profile.id
                const isActive = activeProfileId === profile.id

                return (
                  <article key={profile.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        {isEditing ? (
                          <input
                            type="text"
                            value={renameDraft[profile.id] ?? profile.name}
                            onChange={(event) =>
                              setRenameDraft((current) => ({
                                ...current,
                                [profile.id]: event.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-300 lg:min-w-72"
                          />
                        ) : (
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-bold text-slate-900">{profile.name}</h3>
                            {isActive && (
                              <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-700">
                                Active
                              </span>
                            )}
                          </div>
                        )}
                        <p className="mt-1 text-sm text-slate-500">Created: {formatDate(profile.createdAt)}</p>
                        <p className="text-sm text-slate-500">Last active: {formatDate(profile.lastActiveAt)}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleSelectProfile(profile.id)}
                          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                        >
                          Select
                        </button>

                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleRenameProfile(profile.id)}
                              className="rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-800 transition hover:border-cyan-400"
                            >
                              Save Name
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingProfileId(null)}
                              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProfileId(profile.id)
                              setRenameDraft((current) => ({
                                ...current,
                                [profile.id]: profile.name,
                              }))
                            }}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
                          >
                            Rename
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteProfile(profile)}
                          className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800 transition hover:border-rose-400"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}