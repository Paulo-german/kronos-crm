import { db } from '@/_lib/prisma'
import type { CalendarSyncMapping } from '@prisma/client'

/**
 * Busca o mapping de sync entre um Appointment e um evento externo.
 * SEM cache — usada internamente pelas Trigger.dev tasks que precisam de dados em tempo real.
 * Ownership já validada pelo caller (a task recebe integrationId de uma fonte confiável).
 */
export const getSyncMapping = async (
  appointmentId: string,
  integrationId: string,
): Promise<CalendarSyncMapping | null> => {
  return db.calendarSyncMapping.findUnique({
    where: {
      integrationId_appointmentId: {
        integrationId,
        appointmentId,
      },
    },
  })
}
