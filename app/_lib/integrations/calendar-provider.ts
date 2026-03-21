export interface CalendarEvent {
  externalId?: string
  title: string
  description: string | null
  startDate: Date
  endDate: Date
  timeZone: string
  attendees?: string[]
  location?: string
  metadata?: Record<string, unknown>
}

export interface CalendarWatchResult {
  channelId: string
  resourceId: string
  expiration: string // ISO 8601
}

export interface CalendarProvider {
  createEvent(event: CalendarEvent): Promise<{ externalId: string; htmlLink: string }>
  updateEvent(externalId: string, event: Partial<CalendarEvent>): Promise<void>
  deleteEvent(externalId: string): Promise<void>
  getEvent(externalId: string): Promise<CalendarEvent | null>
  listEvents(startDate: Date, endDate: Date): Promise<CalendarEvent[]>
  listUpdatedEvents(updatedMin: Date): Promise<CalendarEvent[]>
  watchCalendar(webhookUrl: string, channelId: string): Promise<CalendarWatchResult>
  stopWatch(channelId: string, resourceId: string): Promise<void>
}
