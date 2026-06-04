'use client'

import { useCallback } from 'react'
import confetti from 'canvas-confetti'
import useSound from 'use-sound'

const BRAND_COLORS = ['#2563eb', '#3b82f6', '#fbbf24', '#ffffff']
const DURATION_MS = 2500
const SOUND_VOLUME = 0.25

export function useDealWonCelebration() {
  const [playWonSound] = useSound('/sounds/deal-won.mp3', { volume: SOUND_VOLUME })

  const celebrate = useCallback(() => {
    playWonSound()

    const end = Date.now() + DURATION_MS

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: BRAND_COLORS,
      })
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: BRAND_COLORS,
      })
      if (Date.now() < end) requestAnimationFrame(frame)
    }

    frame()
  }, [playWonSound])

  return { celebrate }
}
