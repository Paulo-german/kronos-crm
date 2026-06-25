import type { BusinessHoursConfig } from '@/_actions/agent/update-agent/schema'

// Mapeamento de índice de dia da semana para chave do config (domingo=0)
const DAY_KEYS: (keyof BusinessHoursConfig)[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

const MAX_DAYS_AHEAD = 8

/**
 * Calcula o próximo momento de abertura de uma janela de horário.
 * Busca o primeiro dia (a partir de agora) com horário habilitado e retorna
 * um Date apontando para o `start` daquele dia no timezone correto.
 *
 * Compartilhado entre o follow-up (agente) e os disparos (Prospection) — ambos
 * precisam "dormir até a próxima abertura". Função pura (sem I/O nem log).
 *
 * Estratégia:
 * - Hoje tem horário e ainda não começou → hoje no `start`
 * - Hoje tem horário mas já passou do fim → próximo dia válido
 * - Hoje não tem horário → próximo dia válido
 * - Fallback (nenhum dia habilitado em 7 dias): adia 24h
 */
export function getNextOpeningTime(
  timezone: string,
  config: BusinessHoursConfig,
): Date {
  const now = new Date()

  for (let daysAhead = 0; daysAhead < MAX_DAYS_AHEAD; daysAhead++) {
    const candidateUtc = new Date(
      now.getTime() + daysAhead * 24 * 60 * 60 * 1000,
    )

    // Resolver o dia da semana no timezone alvo
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
      hour12: false,
    })
    const weekdayStr =
      formatter
        .formatToParts(candidateUtc)
        .find((part) => part.type === 'weekday')?.value ?? ''
    const dayIndex = WEEKDAY_MAP[weekdayStr]
    if (dayIndex === undefined) continue

    const dayConfig = config[DAY_KEYS[dayIndex]]
    if (!dayConfig || !dayConfig.enabled) continue

    const [startHour, startMin] = dayConfig.start.split(':').map(Number)

    // Offset UTC do timezone no dia candidato (lida com DST)
    const offsetFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    })
    const tzName =
      offsetFormatter
        .formatToParts(candidateUtc)
        .find((part) => part.type === 'timeZoneName')?.value ?? ''

    let offsetTotalMinutes = 0
    const match = tzName.match(/GMT([+-])(\d{1,2}):?(\d{0,2})/)
    if (match) {
      const isNegative = match[1] === '-'
      const hours = parseInt(match[2], 10)
      const minutes = match[3] ? parseInt(match[3], 10) : 0
      offsetTotalMinutes = (isNegative ? -1 : 1) * (hours * 60 + minutes)
    }

    // Data local (no timezone alvo) do dia candidato
    const candidateLocalDate = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(candidateUtc)
    const [monthStr, dayStr, yearStr] = candidateLocalDate.split('/')

    // UTC = local_datetime - tzOffset
    const utcMs =
      Date.UTC(
        parseInt(yearStr, 10),
        parseInt(monthStr, 10) - 1,
        parseInt(dayStr, 10),
        startHour,
        startMin,
        0,
      ) -
      offsetTotalMinutes * 60 * 1000

    const result = new Date(utcMs)

    // Resultado deve ser no futuro (edge case: DST pode deslocar)
    if (result > now) return result
  }

  // Fallback: nenhum dia com horário habilitado nos próximos 7 dias
  return new Date(now.getTime() + 24 * 60 * 60 * 1000)
}
