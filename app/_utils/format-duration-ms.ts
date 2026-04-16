/**
 * Formata uma duração em milissegundos para string legível.
 * Ex: 150_000 → "2m 30s", 4_500_000 → "1h 15m"
 *
 * Nome distinto de `formatDuration` em `appointment-utils.ts` que recebe (startDate, endDate).
 */
export function formatDurationMs(ms: number): string {
  if (ms <= 0) return '0s'

  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }

  if (minutes > 0) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`
  }

  return `${seconds}s`
}
