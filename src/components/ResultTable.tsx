import { useMemo, useState } from 'react'
import type { AnswerRecord, PracticeSettings } from '../types'
import { speakText } from '../utils/tts'

interface ResultTableProps {
  records: AnswerRecord[]
  settings: PracticeSettings
}

type ResultFilter = 'all' | 'correct' | 'wrong' | 'timeout'
type SortKey = 'section' | 'time' | 'points' | 'result'

function resolveResult(record: AnswerRecord): 'correct' | 'wrong' | 'timeout' {
  return record.result ?? (record.isCorrect ? 'correct' : 'wrong')
}

function resultRank(result: 'correct' | 'wrong' | 'timeout'): number {
  if (result === 'timeout') {
    return 2
  }

  if (result === 'wrong') {
    return 1
  }

  return 0
}

async function copyText(value: string): Promise<void> {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    await navigator.clipboard.writeText(value)
    return
  }

  const textArea = document.createElement('textarea')
  textArea.value = value
  textArea.style.position = 'fixed'
  textArea.style.left = '-9999px'
  document.body.appendChild(textArea)
  textArea.focus()
  textArea.select()
  document.execCommand('copy')
  document.body.removeChild(textArea)
}

export function ResultTable({ records, settings }: ResultTableProps) {
  const [filter, setFilter] = useState<ResultFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('result')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [copyMessage, setCopyMessage] = useState('')

  const filtered = useMemo(() => {
    return records.filter((record) => {
      if (filter === 'all') {
        return true
      }

      return resolveResult(record) === filter
    })
  }, [filter, records])

  const sorted = useMemo(() => {
    const rows = [...filtered]

    rows.sort((left, right) => {
      let cmp = 0
      if (sortKey === 'section') {
        cmp = left.section.localeCompare(right.section)
      } else if (sortKey === 'time') {
        cmp = left.timeTakenMs - right.timeTakenMs
      } else if (sortKey === 'points') {
        cmp = left.pointsEarned - right.pointsEarned
      } else {
        cmp = resultRank(resolveResult(left)) - resultRank(resolveResult(right))
      }

      return sortDirection === 'asc' ? cmp : -cmp
    })

    return rows
  }, [filtered, sortDirection, sortKey])

  const counts = useMemo(
    () => ({
      all: records.length,
      correct: records.filter((record) => resolveResult(record) === 'correct').length,
      wrong: records.filter((record) => resolveResult(record) === 'wrong').length,
      timeout: records.filter((record) => resolveResult(record) === 'timeout').length,
    }),
    [records],
  )

  const onSortChange = (nextSortKey: SortKey) => {
    if (sortKey === nextSortKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortKey(nextSortKey)
    setSortDirection(nextSortKey === 'section' ? 'asc' : 'desc')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(['all', 'correct', 'wrong', 'timeout'] as ResultFilter[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            className={`rounded-full px-3 py-1 text-sm font-semibold transition ${
              filter === item
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {item[0].toUpperCase() + item.slice(1)} ({counts[item]})
          </button>
        ))}

        <div className="ml-auto flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-600">Sort by:</span>
          {([
            { key: 'section', label: 'Section' },
            { key: 'time', label: 'Time' },
            { key: 'points', label: 'Points' },
            { key: 'result', label: 'Result' },
          ] as Array<{ key: SortKey; label: string }>).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onSortChange(item.key)}
              className={`rounded-md border px-3 py-1 font-semibold transition ${
                sortKey === item.key
                  ? 'border-cyan-400 bg-cyan-50 text-cyan-800'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              }`}
            >
              {item.label}
            </button>
          ))}
          <span className="rounded-md bg-slate-100 px-2 py-1 font-semibold text-slate-700">
            {sortDirection === 'asc' ? 'Asc' : 'Desc'}
          </span>
        </div>
      </div>

      {copyMessage && <p className="text-sm font-semibold text-emerald-700">{copyMessage}</p>}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-3 py-2">Section</th>
                <th className="px-3 py-2">Correct Word</th>
                <th className="px-3 py-2">Your Answer</th>
                <th className="px-3 py-2">Result</th>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Repeats</th>
                <th className="px-3 py-2">Points</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((record, index) => {
                const result = resolveResult(record)
                const rowClass =
                  result === 'correct'
                    ? 'border-t border-slate-200'
                    : result === 'timeout'
                      ? 'border-t border-amber-200 bg-amber-50'
                      : 'border-t border-rose-200 bg-rose-50'

                return (
                  <tr key={`${record.section}-${record.correctWord}-${index}`} className={rowClass}>
                    <td className="px-3 py-2">{record.section}</td>
                    <td className="px-3 py-2 font-semibold text-slate-900">{record.correctWord}</td>
                    <td className="px-3 py-2">{record.userAnswer || '-'}</td>
                    <td className="px-3 py-2 capitalize">{result}</td>
                    <td className="px-3 py-2">{(record.timeTakenMs / 1000).toFixed(1)}s</td>
                    <td className="px-3 py-2">{record.repeatCount}</td>
                    <td className="px-3 py-2 font-semibold">{record.pointsEarned}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            speakText(record.correctWord, {
                              voiceURI: settings.voiceURI,
                              rate: settings.voiceRate,
                              lang: settings.language,
                            })
                          }
                          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
                        >
                          Replay
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            copyText(record.correctWord)
                              .then(() => {
                                setCopyMessage(`Copied: ${record.correctWord}`)
                                window.setTimeout(() => setCopyMessage(''), 1400)
                              })
                              .catch(() => {
                                setCopyMessage('Copy failed. Clipboard access may be blocked.')
                                window.setTimeout(() => setCopyMessage(''), 2000)
                              })
                          }}
                          className="rounded-md border border-cyan-300 bg-cyan-50 px-2 py-1 text-xs font-semibold text-cyan-800 transition hover:border-cyan-400"
                        >
                          Copy correct spelling
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
