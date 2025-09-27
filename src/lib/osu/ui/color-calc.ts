type SpectrumEntry = { star: number; color: string }

const STAR_DIFFICULTY_SPECTRUM: SpectrumEntry[] = [
  { star: 0.1, color: '#aaaaaa' },
  { star: 0.1, color: '#4290fb' },
  { star: 1.25, color: '#4fc0ff' },
  { star: 2.0, color: '#4fffd5' },
  { star: 2.5, color: '#7cff4f' },
  { star: 3.3, color: '#f6f05c' },
  { star: 4.2, color: '#ff8068' },
  { star: 4.9, color: '#ff4e6f' },
  { star: 5.8, color: '#c645b8' },
  { star: 6.7, color: '#6563de' },
  { star: 7.7, color: '#18158e' },
  { star: 9.0, color: '#000000' },
  { star: 10.0, color: '#000000' },
]

function hexToRgb(hex: string): [number, number, number] {
  hex = hex.replace('#', '')
  if (hex.length === 3)
    hex = hex
      .split('')
      .map((x) => x + x)
      .join('')
  const num = parseInt(hex, 16)
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function lerpColor(colorA: string, colorB: string, t: number): string {
  const rgbA = hexToRgb(colorA)
  const rgbB = hexToRgb(colorB)
  const rgb = [
    lerp(rgbA[0], rgbB[0], t),
    lerp(rgbA[1], rgbB[1], t),
    lerp(rgbA[2], rgbB[2], t),
  ].map(Math.round) as [number, number, number]
  return rgbToHex(rgb)
}

export function getStarDifficultyColor(starDifficulty: number): string {
  if (starDifficulty <= STAR_DIFFICULTY_SPECTRUM[0].star)
    return STAR_DIFFICULTY_SPECTRUM[0].color
  if (
    starDifficulty >=
    STAR_DIFFICULTY_SPECTRUM[STAR_DIFFICULTY_SPECTRUM.length - 1].star
  )
    return STAR_DIFFICULTY_SPECTRUM[STAR_DIFFICULTY_SPECTRUM.length - 1].color

  for (let i = 1; i < STAR_DIFFICULTY_SPECTRUM.length; i++) {
    const prev = STAR_DIFFICULTY_SPECTRUM[i - 1]
    const curr = STAR_DIFFICULTY_SPECTRUM[i]
    if (starDifficulty <= curr.star) {
      const t = (starDifficulty - prev.star) / (curr.star - prev.star)
      return lerpColor(prev.color, curr.color, t)
    }
  }

  return STAR_DIFFICULTY_SPECTRUM[STAR_DIFFICULTY_SPECTRUM.length - 1].color
}
