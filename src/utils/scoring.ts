export function calculatePoints(repeatCount: number): number {
  if (repeatCount <= 0) {
    return 3
  }

  if (repeatCount === 1) {
    return 2
  }

  if (repeatCount === 2) {
    return 1
  }

  return 0
}
