import type { IntegrationProvider } from '@prisma/client'
import type { CalendarProvider } from './calendar-provider'
import { GoogleCalendarProvider } from './google/google-calendar-provider'

/**
 * Factory: retorna o CalendarProvider correto com base no provider da integração.
 * Similar ao resolveWhatsAppProvider em app/_lib/whatsapp/provider.ts.
 * Adicionar Outlook: incluir novo case antes do throw.
 */
export function resolveCalendarProvider(
  provider: IntegrationProvider,
  accessToken: string,
  calendarId: string = 'primary',
): CalendarProvider {
  if (provider === 'GOOGLE_CALENDAR') {
    return new GoogleCalendarProvider(accessToken, calendarId)
  }

  throw new Error(`Unsupported calendar provider: ${provider}`)
}
