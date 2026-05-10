import 'server-only'
import { db } from '@/_lib/prisma'
import type { DistributionModel } from '@prisma/client'
import { timeToMinutes, minutesToTime, formatDateUtc } from './slot-utils'

// Janela de dias considerada para calcular taxa de utilização no modelo UTILIZATION
const UTILIZATION_WINDOW_DAYS = 7

export interface AvailableProfessionalDto {
  id: string
  name: string
  avatarUrl: string | null
}

interface EligibleProfessional {
  id: string
  name: string
  avatarUrl: string | null
  createdAt: Date
}

interface GetAvailableProfessionalsParams {
  orgId: string
  serviceId: string
  date: Date // data do agendamento
  startTime: string // "HH:mm"
  contactId?: string // necessário para DistributionModel LOYALTY
}


/**
 * Verifica se um profissional está disponível no slot especificado.
 * Retorna false se: dia de folga, fora da jornada, ou há conflito de appointment.
 */
async function isProfessionalAvailable(
  professionalId: string,
  orgId: string,
  date: Date,
  startTimeMinutes: number,
  endTimeMinutes: number,
): Promise<boolean> {
  const dayOfWeek = date.getUTCDay()

  // Verifica exceções antes de consultar a jornada padrão
  const exception = await db.workingHoursException.findFirst({
    where: { professionalId, date },
    select: { type: true, startTime: true, endTime: true },
  })

  if (exception?.type === 'OFF') return false

  // Resolve jornada efetiva: CUSTOM_HOURS prevalece sobre WorkingHours padrão
  let workStart: string
  let workEnd: string

  if (exception?.type === 'CUSTOM_HOURS' && exception.startTime && exception.endTime) {
    workStart = exception.startTime
    workEnd = exception.endTime
  } else {
    const workingHours = await db.workingHours.findFirst({
      where: { professionalId, dayOfWeek },
      select: { startTime: true, endTime: true },
    })

    if (!workingHours) return false // Profissional não trabalha neste dia da semana

    workStart = workingHours.startTime
    workEnd = workingHours.endTime
  }

  if (startTimeMinutes < timeToMinutes(workStart) || endTimeMinutes > timeToMinutes(workEnd)) {
    return false
  }

  // Monta Date objects para a comparação de overlap com appointments do banco
  const dateStr = formatDateUtc(date)
  const slotStartDate = new Date(`${dateStr}T${minutesToTime(startTimeMinutes)}:00.000Z`)
  const slotEndDate = new Date(`${dateStr}T${minutesToTime(endTimeMinutes)}:00.000Z`)

  // Verifica conflito com appointments ativos do profissional
  const conflict = await db.appointment.findFirst({
    where: {
      professionalId,
      organizationId: orgId,
      status: { notIn: ['CANCELED', 'NO_SHOW'] },
      startDate: { lt: slotEndDate },
      endDate: { gt: slotStartDate },
    },
    select: { id: true },
  })

  return !conflict
}

/**
 * Aplica o modelo de distribuição UTILIZATION: profissional com menor número de
 * appointments ativos nos próximos UTILIZATION_WINDOW_DAYS dias vem primeiro.
 */
async function applyUtilizationModel(
  professionals: EligibleProfessional[],
  orgId: string,
): Promise<EligibleProfessional[]> {
  const now = new Date()
  const windowEnd = new Date(now)
  windowEnd.setUTCDate(windowEnd.getUTCDate() + UTILIZATION_WINDOW_DAYS)

  const counts = await Promise.all(
    professionals.map(async (professional) => {
      const count = await db.appointment.count({
        where: {
          professionalId: professional.id,
          organizationId: orgId,
          status: { notIn: ['CANCELED', 'NO_SHOW'] },
          startDate: { gte: now, lt: windowEnd },
        },
      })
      return { professional, count }
    }),
  )

  // Ordenação estável: menor count primeiro, empate por id para determinismo
  return counts
    .sort((a, b) => a.count - b.count || a.professional.id.localeCompare(b.professional.id))
    .map((item) => item.professional)
}

/**
 * Aplica o modelo de distribuição ROUND_ROBIN: o profissional seguinte ao último
 * que recebeu um agendamento vem primeiro. Sem histórico, ordena por createdAt ASC.
 */
async function applyRoundRobinModel(
  professionals: EligibleProfessional[],
  orgId: string,
): Promise<EligibleProfessional[]> {
  const lastAppointment = await db.appointment.findFirst({
    where: {
      organizationId: orgId,
      status: { notIn: ['CANCELED', 'NO_SHOW'] },
      professionalId: { in: professionals.map((professional) => professional.id) },
    },
    orderBy: { createdAt: 'desc' },
    select: { professionalId: true },
  })

  if (!lastAppointment?.professionalId) {
    // Sem histórico: ordenar por data de criação do profissional
    return [...professionals].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    )
  }

  const lastProfessionalId = lastAppointment.professionalId
  const lastIndex = professionals.findIndex((p) => p.id === lastProfessionalId)

  if (lastIndex === -1) {
    return professionals
  }

  // Rotaciona a fila: o próximo após o último atendente vai para o início
  const nextIndex = (lastIndex + 1) % professionals.length
  return [
    ...professionals.slice(nextIndex),
    ...professionals.slice(0, nextIndex),
  ]
}

/**
 * Aplica o modelo de distribuição LOYALTY: profissional que já atendeu o contato
 * fica em primeiro. Fallback para secondaryModel (ou UTILIZATION) se sem histórico.
 */
async function applyLoyaltyModel(
  professionals: EligibleProfessional[],
  orgId: string,
  contactId: string | undefined,
  secondaryModel: DistributionModel | null,
): Promise<EligibleProfessional[]> {
  if (contactId) {
    const loyalAppointment = await db.appointment.findFirst({
      where: {
        organizationId: orgId,
        contactId,
        professionalId: { in: professionals.map((professional) => professional.id) },
        status: { notIn: ['CANCELED', 'NO_SHOW'] },
      },
      orderBy: { createdAt: 'desc' },
      select: { professionalId: true },
    })

    if (loyalAppointment?.professionalId) {
      const loyalProf = professionals.find(
        (p) => p.id === loyalAppointment.professionalId,
      )
      if (loyalProf) {
        const rest = professionals.filter(
          (p) => p.id !== loyalAppointment.professionalId,
        )
        return [loyalProf, ...rest]
      }
    }
  }

  // Sem match de fidelidade: aplica modelo secundário
  const effectiveSecondary = secondaryModel ?? 'UTILIZATION'
  return applyDistributionModel(professionals, orgId, effectiveSecondary, undefined, null)
}

/**
 * Aplica o modelo de distribuição MANUAL: ordena pela ManualProfessionalOrder.
 * Profissionais sem entrada vão para o fim.
 */
async function applyManualModel(
  professionals: EligibleProfessional[],
  orgId: string,
): Promise<EligibleProfessional[]> {
  const orders = await db.manualProfessionalOrder.findMany({
    where: {
      organizationId: orgId,
      professionalId: { in: professionals.map((professional) => professional.id) },
    },
    select: { professionalId: true, order: true },
  })

  const orderMap = new Map(orders.map((o) => [o.professionalId, o.order]))

  return [...professionals].sort((a, b) => {
    const orderA = orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER
    const orderB = orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER
    return orderA - orderB
  })
}

/**
 * Despacha o modelo de distribuição correto sobre o conjunto de profissionais elegíveis.
 */
async function applyDistributionModel(
  professionals: EligibleProfessional[],
  orgId: string,
  model: DistributionModel,
  contactId: string | undefined,
  secondaryModel: DistributionModel | null,
): Promise<EligibleProfessional[]> {
  if (model === 'UTILIZATION') {
    return applyUtilizationModel(professionals, orgId)
  }

  if (model === 'ROUND_ROBIN') {
    return applyRoundRobinModel(professionals, orgId)
  }

  if (model === 'FIRST_AVAILABLE') {
    // Sem reordenação por profissional — a UI/tool pega o primeiro slot mais cedo
    return professionals
  }

  if (model === 'LOYALTY') {
    return applyLoyaltyModel(professionals, orgId, contactId, secondaryModel)
  }

  if (model === 'MANUAL') {
    return applyManualModel(professionals, orgId)
  }

  return professionals
}

/**
 * Retorna profissionais disponíveis para um serviço em uma data/horário específico.
 *
 * Sem cache — disponibilidade muda em tempo real conforme agendamentos são criados.
 * Aplica o DistributionModel configurado na org para ordenar os profissionais elegíveis.
 */
export async function getAvailableProfessionals(
  params: GetAvailableProfessionalsParams,
): Promise<AvailableProfessionalDto[]> {
  const { orgId, serviceId, date, startTime, contactId } = params

  // Passo 1: busca o serviço para obter duração e confirmar que está ativo
  const service = await db.service.findFirst({
    where: { id: serviceId, organizationId: orgId, isActive: true },
    select: { id: true, duration: true },
  })

  if (!service) return []

  const startTimeMinutes = timeToMinutes(startTime)
  const endTimeMinutes = startTimeMinutes + service.duration

  // Passo 2: busca profissionais ativos que executam o serviço
  const professionalsRaw = await db.professional.findMany({
    where: {
      organizationId: orgId,
      isActive: true,
      professionalServices: { some: { serviceId } },
    },
    select: { id: true, name: true, avatarUrl: true, createdAt: true },
    orderBy: { name: 'asc' },
  })

  // Passo 3: filtra em paralelo quem está disponível no slot
  const availabilityResults = await Promise.all(
    professionalsRaw.map(async (professional) => {
      const available = await isProfessionalAvailable(
        professional.id,
        orgId,
        date,
        startTimeMinutes,
        endTimeMinutes,
      )
      return { professional, available }
    }),
  )

  const eligibleProfessionals: EligibleProfessional[] = availabilityResults
    .filter((result) => result.available)
    .map((result) => result.professional)

  if (eligibleProfessionals.length === 0) return []

  // Passo 4: aplica o DistributionModel configurado na org
  const organization = await db.organization.findFirst({
    where: { id: orgId },
    select: { distributionModel: true, secondaryDistributionModel: true },
  })

  const distributionModel = organization?.distributionModel ?? 'UTILIZATION'
  const secondaryModel = organization?.secondaryDistributionModel ?? null

  const orderedProfessionals = await applyDistributionModel(
    eligibleProfessionals,
    orgId,
    distributionModel,
    contactId,
    secondaryModel,
  )

  return orderedProfessionals.map((professional) => ({
    id: professional.id,
    name: professional.name,
    avatarUrl: professional.avatarUrl,
  }))
}
