import { db } from '@/_lib/prisma'

export interface AppointmentSlotDto {
  startDate: Date
  endDate: Date
}

/**
 * Retorna todos os appointments ATIVOS (excluindo CANCELED e NO_SHOW) de um
 * responsável em um range de datas.
 *
 * Usada pela tool `list_availability` no runtime do Trigger.dev.
 *
 * REGRA DE CACHE: esta função NÃO usa cache. Roda dentro do Trigger.dev (worker
 * assíncrono) onde o cache do Next.js não opera, e precisa de dados em tempo real
 * para garantir que slots calculados estejam realmente disponíveis.
 */
export async function getAppointmentsByDateRange(
  organizationId: string,
  assignedTo: string,
  startDate: Date,
  endDate: Date,
): Promise<AppointmentSlotDto[]> {
  return db.appointment.findMany({
    where: {
      organizationId,
      assignedTo,
      status: { notIn: ['CANCELED', 'NO_SHOW'] },
      startDate: { lt: endDate },
      endDate: { gt: startDate },
    },
    select: {
      startDate: true,
      endDate: true,
    },
    orderBy: { startDate: 'asc' },
  })
}
