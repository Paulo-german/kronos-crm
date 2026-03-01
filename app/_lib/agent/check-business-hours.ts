import type { BusinessHoursConfig } from '@/_actions/agent/update-agent/schema'

const DAY_KEYS: (keyof BusinessHoursConfig)[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]

/**
 * Verifica se o agente está dentro do horário de funcionamento.
 * Usa Intl.DateTimeFormat para resolver timezone sem dependências externas.
 */
export function checkBusinessHours(
  timezone: string,
  config: BusinessHoursConfig,
): boolean {
  const now = new Date()

  // Obter hora e dia da semana no timezone do agente
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'short',
    hour12: false,
  })

  const parts = formatter.formatToParts(now)
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0)
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0)
  const weekday = parts.find((part) => part.type === 'weekday')?.value ?? ''

  // Mapear weekday curto do Intl para índice (Sun=0, Mon=1, ..., Sat=6)
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }

  const dayIndex = weekdayMap[weekday] ?? 0
  const dayKey = DAY_KEYS[dayIndex]
  const dayConfig = config[dayKey]

  if (!dayConfig.enabled) return false

  const currentMinutes = hour * 60 + minute
  const [startHour, startMin] = dayConfig.start.split(':').map(Number)
  const [endHour, endMin] = dayConfig.end.split(':').map(Number)

  const startMinutes = startHour * 60 + startMin
  const endMinutes = endHour * 60 + endMin

  return currentMinutes >= startMinutes && currentMinutes < endMinutes
}
