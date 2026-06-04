import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import wordsData from '../data/words.json'
import type { PracticeSettings, WordSection } from '../types'
import {
  addWeakWordManually,
  getFavouriteWords,
  getSavedSettings,
  getWeakWords,
  makeWeakWordKey,
  removeWeakWord,
  toggleFavouriteWord,
} from '../utils/storage'
import { speakText } from '../utils/tts'

const sections = wordsData as WordSection[]

const fallbackSettings: Pick<PracticeSettings, 'voiceURI' | 'voiceRate' | 'language'> = {
  voiceURI: '',
  voiceRate: 0.85,
  language: 'en-CA',
}

export function WordLibrary() {
  const [search, setSearch] = useState('')
  const [sectionFilter, setSectionFilter] = useState('all')
  const [showOnlyFavourites, setShowOnlyFavourites] = useState(false)
  const [weakKeys, setWeakKeys] = useState(() => new Set(getWeakWords().map((item) => item.key)))
  const [favouriteKeys, setFavouriteKeys] = useState(
    () => new Set(getFavouriteWords().map((item) => item.key)),
  )

  const savedSettings = getSavedSettings()
  const speechSettings = {
    voiceURI: savedSettings?.voiceURI ?? fallbackSettings.voiceURI,
    voiceRate: savedSettings?.voiceRate ?? fallbackSettings.voiceRate,
    language: savedSettings?.language ?? fallbackSettings.language,
  }

  const allWords = useMemo(
    () =>
      sections.flatMap((section) =>
        section.words.map((word) => ({
          section: section.section,
          word,
          key: makeWeakWordKey(section.section, word),
        })),
      ),
    [],
  )

  const filteredWords = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase()

    return allWords.filter((item) => {
      if (sectionFilter !== 'all' && item.section !== sectionFilter) {
        return false
      }

      if (showOnlyFavourites && !favouriteKeys.has(item.key)) {
        return false
      }

      if (!normalizedQuery) {
        return true
      }

      return (
        item.word.toLowerCase().includes(normalizedQuery) ||
        item.section.toLowerCase().includes(normalizedQuery)
      )
    })
  }, [allWords, favouriteKeys, search, sectionFilter, showOnlyFavourites])

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Word Library</h1>
          <p className="text-sm text-slate-600">
            Browse sections, listen to words, and curate favourites + weak words.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/setup"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
          >
            Setup
          </Link>
          <Link
            to="/"
            className="rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-800 transition hover:border-cyan-400"
          >
            Home
          </Link>
        </div>
      </div>

      <div className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr,220px,auto]">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search words or sections"
          className="rounded-xl border border-slate-300 px-4 py-3 text-slate-800 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-300"
        />

        <select
          value={sectionFilter}
          onChange={(event) => setSectionFilter(event.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-800 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-300"
        >
          <option value="all">All sections</option>
          {sections.map((section) => (
            <option key={section.section} value={section.section}>
              {section.section}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setShowOnlyFavourites((current) => !current)}
          className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
            showOnlyFavourites
              ? 'bg-amber-500 text-slate-900 hover:bg-amber-400'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          {showOnlyFavourites ? 'Showing favourites only' : 'Show favourites only'}
        </button>
      </div>

      <div className="mb-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <p>Total words: {allWords.length}</p>
        <p>Filtered words: {filteredWords.length}</p>
        <p>Favourites: {favouriteKeys.size}</p>
        <p>Weak words tracked: {weakKeys.size}</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-3 py-2">Section</th>
                <th className="px-3 py-2">Word</th>
                <th className="px-3 py-2">Favourite</th>
                <th className="px-3 py-2">Weak</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredWords.map((item) => {
                const isFavourite = favouriteKeys.has(item.key)
                const isWeak = weakKeys.has(item.key)

                return (
                  <tr key={item.key} className="border-t border-slate-200">
                    <td className="px-3 py-2">{item.section}</td>
                    <td className="px-3 py-2 font-semibold text-slate-900">{item.word}</td>
                    <td className="px-3 py-2">{isFavourite ? 'Yes' : 'No'}</td>
                    <td className="px-3 py-2">{isWeak ? 'Yes' : 'No'}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            speakText(item.word, {
                              voiceURI: speechSettings.voiceURI,
                              rate: speechSettings.voiceRate,
                              lang: speechSettings.language,
                            })
                          }
                          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
                        >
                          Listen
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            toggleFavouriteWord(item.section, item.word)
                            setFavouriteKeys(new Set(getFavouriteWords().map((entry) => entry.key)))
                          }}
                          className={`rounded-md px-2 py-1 text-xs font-semibold transition ${
                            isFavourite
                              ? 'bg-amber-500 text-slate-900 hover:bg-amber-400'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {isFavourite ? 'Unfavourite' : 'Favourite'}
                        </button>

                        {isWeak ? (
                          <button
                            type="button"
                            onClick={() => {
                              removeWeakWord(item.section, item.word)
                              setWeakKeys(new Set(getWeakWords().map((entry) => entry.key)))
                            }}
                            className="rounded-md bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-800 transition hover:bg-rose-200"
                          >
                            Remove weak
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              addWeakWordManually(item.section, item.word)
                              setWeakKeys(new Set(getWeakWords().map((entry) => entry.key)))
                            }}
                            className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-200"
                          >
                            Add weak
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
