import { normalizeAnswer } from './normalizeAnswer'
import { makeWeakWordKey } from './storage'
import type { PracticeItem, PracticeSettings, WeakWordRecord, WordSection } from '../types'

function shuffleArray<T>(items: T[]): T[] {
  const shuffled = [...items]

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = shuffled[i]
    shuffled[i] = shuffled[j]
    shuffled[j] = temp
  }

  return shuffled
}

function toPracticeItems(sections: WordSection[]): PracticeItem[] {
  return sections.flatMap((section) =>
    section.words.map((word) => ({
      id: `${normalizeAnswer(section.section)}::${normalizeAnswer(word)}`,
      section: section.section,
      word,
    })),
  )
}

function applyQuestionLimit(items: PracticeItem[], count: number | 'all'): PracticeItem[] {
  if (count === 'all') {
    return items
  }

  return items.slice(0, count)
}

export function buildPracticeItems(
  sections: WordSection[],
  settings: PracticeSettings,
  weakWords: WeakWordRecord[],
): PracticeItem[] {
  const allItems = toPracticeItems(sections)

  if (settings.mode === 'random-all') {
    return applyQuestionLimit(shuffleArray(allItems), settings.questionCount)
  }

  if (settings.mode === 'weak-only') {
    const weakSet = new Set(weakWords.map((record) => record.key))
    const weakItems = allItems.filter((item) =>
      weakSet.has(makeWeakWordKey(item.section, item.word)),
    )

    return applyQuestionLimit(shuffleArray(weakItems), settings.questionCount)
  }

  const selectedSection = sections.find((section) => section.section === settings.section)
  if (!selectedSection) {
    return []
  }

  const sectionItems = selectedSection.words.map((word) => ({
    id: `${normalizeAnswer(selectedSection.section)}::${normalizeAnswer(word)}`,
    section: selectedSection.section,
    word,
  }))

  if (settings.mode === 'random-section') {
    return applyQuestionLimit(shuffleArray(sectionItems), settings.questionCount)
  }

  return applyQuestionLimit(sectionItems, settings.questionCount)
}
