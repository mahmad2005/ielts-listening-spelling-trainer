import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ModeSelector } from '../components/ModeSelector'
import { SectionSelector } from '../components/SectionSelector'
import { VoiceSelector } from '../components/VoiceSelector'
import wordsData from '../data/words.json'
import type { PracticeMode, PracticeSettings, WordSection } from '../types'
import {
  getSavedSettings,
  getSavedVoiceURI,
  getWeakWords,
  saveSelectedVoiceURI,
  saveSettings,
} from '../utils/storage'
import { loadVoices } from '../utils/tts'
import { validateWordSections } from '../utils/wordValidation'
import { buildPracticeItems } from '../utils/wordSelector'

const sections = wordsData as WordSection[]

interface SetupLocationState {
  presetMode?: PracticeMode
}

const defaultSettings: PracticeSettings = {
  mode: 'random-section',
  section: sections[0]?.section ?? '',
  questionCount: 20,
  timeLimitSec: 15,
  voiceRate: 0.85,
  voiceURI: '',
  language: 'en-CA',
}

export function Setup() {
  const navigate = useNavigate()
  const location = useLocation()
  const routeState = (location.state as SetupLocationState | null) ?? null
  const weakCount = getWeakWords().length

  const [settings, setSettings] = useState<PracticeSettings>(() => {
    const saved = getSavedSettings()
    return saved ? { ...defaultSettings, ...saved } : defaultSettings
  })
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [error, setError] = useState('')
  const validationReport = useMemo(() => validateWordSections(sections), [])

  useEffect(() => {
    if (routeState?.presetMode) {
      setSettings((current) => ({ ...current, mode: routeState.presetMode ?? current.mode }))
    }
  }, [routeState?.presetMode])

  useEffect(() => {
    loadVoices().then((loadedVoices) => {
      setVoices(loadedVoices)
      if (!settings.voiceURI) {
        const savedVoiceURI = getSavedVoiceURI()
        const savedVoice = loadedVoices.find((voice) => voice.voiceURI === savedVoiceURI)

        if (savedVoice) {
          setSettings((current) => ({ ...current, voiceURI: savedVoice.voiceURI, language: savedVoice.lang }))
          return
        }

        const preferred =
          loadedVoices.find((voice) => voice.lang.toLowerCase().startsWith('en-ca')) ??
          loadedVoices.find((voice) => voice.lang.toLowerCase().startsWith('en-gb')) ??
          loadedVoices.find((voice) => voice.lang.toLowerCase().startsWith('en'))

        if (preferred) {
          setSettings((current) => ({ ...current, voiceURI: preferred.voiceURI, language: preferred.lang }))
        }
      }
    })
  }, [settings.voiceURI])

  const shouldSelectSection = settings.mode === 'sequential-section' || settings.mode === 'random-section'
  const timeOptions: Array<PracticeSettings['timeLimitSec']> = [10, 15, 20]
  const questionOptions: Array<PracticeSettings['questionCount']> = [10, 20, 50, 'all']

  const totalWordCount = useMemo(
    () => sections.reduce((total, section) => total + section.words.length, 0),
    [],
  )

  const onStart = () => {
    setError('')

    if (shouldSelectSection && !settings.section) {
      setError('Please select a section.')
      return
    }

    const selected = buildPracticeItems(sections, settings, getWeakWords())

    if (selected.length === 0) {
      setError(
        settings.mode === 'weak-only'
          ? 'No weak words found yet. Finish a practice round first.'
          : 'No words found for current setup.',
      )
      return
    }

    saveSettings(settings)
    navigate('/practice', {
      state: {
        settings,
        items: selected,
      },
    })
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl font-black text-slate-900">Practice Setup</h1>
        <div className="flex items-center gap-4 text-sm font-semibold">
          <Link to="/library" className="text-emerald-700 hover:text-emerald-900">
            Word Library
          </Link>
          <Link to="/home" className="text-cyan-700 hover:text-cyan-900">
            Back Home
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Mode</h2>
          <ModeSelector
            value={settings.mode}
            onChange={(mode) => setSettings((current) => ({ ...current, mode }))}
          />
        </section>

        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Options</h2>

          <SectionSelector
            value={settings.section}
            sections={sections}
            disabled={!shouldSelectSection}
            onChange={(section) => setSettings((current) => ({ ...current, section }))}
          />

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Number of questions</p>
            <div className="grid grid-cols-4 gap-2">
              {questionOptions.map((option) => (
                <button
                  key={`${option}`}
                  type="button"
                  onClick={() => setSettings((current) => ({ ...current, questionCount: option }))}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    settings.questionCount === option
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {option === 'all' ? 'All' : option}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Time limit</p>
            <div className="grid grid-cols-3 gap-2">
              {timeOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSettings((current) => ({ ...current, timeLimitSec: option }))}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    settings.timeLimitSec === option
                      ? 'bg-cyan-700 text-white'
                      : 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100'
                  }`}
                >
                  {option}s
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Voice rate: {settings.voiceRate.toFixed(2)}
            </label>
            <input
              type="range"
              min={0.6}
              max={1.2}
              step={0.05}
              value={settings.voiceRate}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  voiceRate: Number(event.target.value),
                }))
              }
              className="w-full"
            />
          </div>

          <VoiceSelector
            voices={voices}
            value={settings.voiceURI}
            onChange={(voiceURI) => {
              const selectedVoice = voices.find((voice) => voice.voiceURI === voiceURI)
              saveSelectedVoiceURI(voiceURI)
              setSettings((current) => ({
                ...current,
                voiceURI,
                language: selectedVoice?.lang ?? current.language,
              }))
            }}
          />

          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <p>Total words loaded: {totalWordCount}</p>
            <p>Weak words available: {weakCount}</p>
            <p>Data issues flagged by validator: {validationReport.issues.length}</p>
          </div>

          {error && <p className="text-sm font-semibold text-rose-700">{error}</p>}

          <button
            type="button"
            onClick={onStart}
            className="w-full rounded-xl bg-emerald-600 px-5 py-3 text-lg font-bold text-white transition hover:bg-emerald-700"
          >
            Start
          </button>
        </section>
      </div>
    </main>
  )
}
