import crypto from 'node:crypto'
import type { CalendarEvent } from '../calendar-provider'

const DEFAULT_TIMEZONE = 'America/Sao_Paulo'

interface AppointmentData {
  title: string
  description: string | null
  startDate: Date
  endDate: Date
}

/**
 * Converte dados de um Appointment do CRM para o formato CalendarEvent.
 * Aceita timezone como parâmetro para suportar fusos diferentes.
 */
export function appointmentToCalendarEvent(
  appointment: AppointmentData,
  timeZone: string = DEFAULT_TIMEZONE,
): CalendarEvent {
  return {
    title: appointment.title,
    description: appointment.description,
    startDate: appointment.startDate,
    endDate: appointment.endDate,
    timeZone,
  }
}

/**
 * Computa checksum SHA-256 (truncado para 16 chars) do conteúdo do appointment.
 * Usado para detectar se o evento mudou antes de fazer round-trips à API.
 */
export function computeChecksum(appointment: AppointmentData): string {
  const content = [
    appointment.title,
    appointment.description ?? '',
    appointment.startDate.toISOString(),
    appointment.endDate.toISOString(),
  ].join('|')

  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16)
}
