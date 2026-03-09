export async function fireConfetti() {
  const confetti = (await import('canvas-confetti')).default
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 }
  confetti({ ...defaults, particleCount: 50, origin: { x: 0.3, y: 0.6 } })
  confetti({ ...defaults, particleCount: 50, origin: { x: 0.7, y: 0.6 } })
}
