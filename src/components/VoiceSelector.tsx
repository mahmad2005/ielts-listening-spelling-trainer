interface VoiceSelectorProps {
  voices: SpeechSynthesisVoice[]
  value: string
  onChange: (voiceURI: string) => void
}

type VoiceGroup = 'en-CA' | 'en-GB' | 'en-US' | 'en-AU' | 'Other'

function getVoiceGroup(language: string): VoiceGroup {
  const lang = language.toLowerCase()

  if (lang.startsWith('en-ca')) {
    return 'en-CA'
  }

  if (lang.startsWith('en-gb')) {
    return 'en-GB'
  }

  if (lang.startsWith('en-us')) {
    return 'en-US'
  }

  if (lang.startsWith('en-au')) {
    return 'en-AU'
  }

  return 'Other'
}

export function VoiceSelector({ voices, value, onChange }: VoiceSelectorProps) {
  const groupedVoices = voices.reduce<Record<VoiceGroup, SpeechSynthesisVoice[]>>(
    (groups, voice) => {
      const group = getVoiceGroup(voice.lang)
      groups[group].push(voice)
      return groups
    },
    {
      'en-CA': [],
      'en-GB': [],
      'en-US': [],
      'en-AU': [],
      Other: [],
    },
  )

  const orderedGroups: VoiceGroup[] = ['en-CA', 'en-GB', 'en-AU', 'en-US', 'Other']

  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">Voice (IELTS: en-CA or en-GB recommended)</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 shadow-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-300"
      >
        <option value="">System default (prefer en-CA / en-GB)</option>
        {orderedGroups.map((group) => {
          const options = groupedVoices[group]
          if (options.length === 0) {
            return null
          }

          return (
            <optgroup key={group} label={group}>
              {options.map((voice) => (
                <option key={voice.voiceURI} value={voice.voiceURI}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </optgroup>
          )
        })}
      </select>
    </label>
  )
}
