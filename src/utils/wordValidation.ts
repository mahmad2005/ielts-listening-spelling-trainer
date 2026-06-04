import type { WordSection } from '../types'

export interface WordValidationIssue {
  kind: 'duplicate' | 'empty' | 'suspicious-length' | 'possible-typo'
  section: string
  word: string
  detail: string
}

export interface WordValidationReport {
  issues: WordValidationIssue[]
  duplicateCount: number
  emptyCount: number
  suspiciousLengthCount: number
  possibleTypoCount: number
}

function normalizeWord(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, ' ')
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) {
    return 0
  }

  if (a.length === 0) {
    return b.length
  }

  if (b.length === 0) {
    return a.length
  }

  const matrix: number[][] = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0))

  for (let row = 0; row <= a.length; row += 1) {
    matrix[row][0] = row
  }

  for (let column = 0; column <= b.length; column += 1) {
    matrix[0][column] = column
  }

  for (let row = 1; row <= a.length; row += 1) {
    for (let column = 1; column <= b.length; column += 1) {
      const cost = a[row - 1] === b[column - 1] ? 0 : 1
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost,
      )
    }
  }

  return matrix[a.length][b.length]
}

function collectPossibleTypoCandidates(sections: WordSection[]): WordValidationIssue[] {
  const entries = sections.flatMap((section) =>
    section.words.map((word) => ({
      section: section.section,
      word,
      normalized: normalizeWord(word),
    })),
  )

  const issues: WordValidationIssue[] = []

  for (let i = 0; i < entries.length; i += 1) {
    const left = entries[i]
    if (!left.normalized || left.normalized.length < 5) {
      continue
    }

    for (let j = i + 1; j < entries.length; j += 1) {
      const right = entries[j]
      if (!right.normalized || right.normalized.length < 5) {
        continue
      }

      if (left.normalized === right.normalized) {
        continue
      }

      if (Math.abs(left.normalized.length - right.normalized.length) > 2) {
        continue
      }

      if (left.normalized[0] !== right.normalized[0]) {
        continue
      }

      const leftPrefix = left.normalized.slice(0, 3)
      const rightPrefix = right.normalized.slice(0, 3)
      if (leftPrefix !== rightPrefix) {
        continue
      }

      const distance = levenshteinDistance(left.normalized, right.normalized)
      if (distance <= 2) {
        issues.push({
          kind: 'possible-typo',
          section: left.section,
          word: left.word,
          detail: `Possibly similar to "${right.word}" in ${right.section} (distance ${distance})`,
        })
      }
    }
  }

  return issues
}

export function validateWordSections(
  sections: WordSection[],
  options: { minLength?: number; maxLength?: number } = {},
): WordValidationReport {
  const minLength = options.minLength ?? 2
  const maxLength = options.maxLength ?? 45

  const issues: WordValidationIssue[] = []
  const seen = new Map<string, { section: string; word: string }>()

  for (const section of sections) {
    for (const word of section.words) {
      const normalized = normalizeWord(word)

      if (!normalized) {
        issues.push({
          kind: 'empty',
          section: section.section,
          word,
          detail: 'Word is empty after trimming',
        })
        continue
      }

      if (normalized.length < minLength || normalized.length > maxLength) {
        issues.push({
          kind: 'suspicious-length',
          section: section.section,
          word,
          detail: `Word length ${normalized.length} is outside ${minLength}-${maxLength}`,
        })
      }

      const existing = seen.get(normalized)
      if (existing) {
        issues.push({
          kind: 'duplicate',
          section: section.section,
          word,
          detail: `Duplicate of "${existing.word}" in ${existing.section}`,
        })
      } else {
        seen.set(normalized, { section: section.section, word })
      }
    }
  }

  const typoCandidates = collectPossibleTypoCandidates(sections)

  const allIssues = [...issues, ...typoCandidates]
  return {
    issues: allIssues,
    duplicateCount: allIssues.filter((issue) => issue.kind === 'duplicate').length,
    emptyCount: allIssues.filter((issue) => issue.kind === 'empty').length,
    suspiciousLengthCount: allIssues.filter((issue) => issue.kind === 'suspicious-length').length,
    possibleTypoCount: allIssues.filter((issue) => issue.kind === 'possible-typo').length,
  }
}
