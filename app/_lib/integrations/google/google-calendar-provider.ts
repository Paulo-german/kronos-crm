import type { CalendarEvent, CalendarProvider, CalendarWatchResult } from '../calendar-provider'

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3'

interface GoogleEventResponse {
  id: string
  status?: string
  summary?: string
  description?: string
  location?: string
  htmlLink?: string
  updated?: string
  start?: { dateTime?: string; date?: string; timeZone?: string }
  end?: { dateTime?: string; date?: string; timeZone?: string }
  attendees?: Array<{ email: string }>
}

export class GoogleCalendarProvider implements CalendarProvider {
  constructor(
    private accessToken: string,
    private calendarId: string = 'primary',
  ) {}

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    }
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${CALENDAR_API_BASE}${path}`
    const response = await fetch(url, {
      ...options,
      headers: { ...this.headers, ...(options?.headers as Record<string, string> | undefined) },
    })

    if (!response.ok) {
      const error = await response.text()
      const statusError = new Error(`Google Calendar API error (${response.status}): ${error}`)
      ;(statusError as Error & { status: number }).status = response.status
      throw statusError
    }

    if (response.status === 204) return {} as T
    return response.json()
  }

  async createEvent(event: CalendarEvent): Promise<{ externalId: string; htmlLink: string }> {
    const body = this.toGoogleEvent(event)

    const result = await this.request<{ id: string; htmlLink: string }>(
      `/calendars/${encodeURIComponent(this.calendarId)}/events`,
      { method: 'POST', body: JSON.stringify(body) },
    )

    return { externalId: result.id, htmlLink: result.htmlLink }
  }

  async updateEvent(externalId: string, event: Partial<CalendarEvent>): Promise<void> {
    const body = this.toGoogleEvent(event as CalendarEvent, true)

    await this.request(
      `/calendars/${encodeURIComponent(this.calendarId)}/events/${encodeURIComponent(externalId)}`,
      { method: 'PATCH', body: JSON.stringify(body) },
    )
  }

  async deleteEvent(externalId: string): Promise<void> {
    await this.request(
      `/calendars/${encodeURIComponent(this.calendarId)}/events/${encodeURIComponent(externalId)}`,
      { method: 'DELETE' },
    )
  }

  async getEvent(externalId: string): Promise<CalendarEvent | null> {
    try {
      const result = await this.request<GoogleEventResponse>(
        `/calendars/${encodeURIComponent(this.calendarId)}/events/${encodeURIComponent(externalId)}`,
      )

      if (result.status === 'cancelled') return null
      return this.fromGoogleEvent(result)
    } catch (error) {
      if ((error as Error & { status?: number }).status === 404) return null
      throw error
    }
  }

  async listEvents(startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    const params = new URLSearchParams({
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '2500',
    })

    const result = await this.request<{ items?: GoogleEventResponse[] }>(
      `/calendars/${encodeURIComponent(this.calendarId)}/events?${params}`,
    )

    return (result.items ?? [])
      .filter((item) => item.status !== 'cancelled')
      .map((item) => this.fromGoogleEvent(item))
  }

  async listUpdatedEvents(updatedMin: Date): Promise<CalendarEvent[]> {
    const params = new URLSearchParams({
      updatedMin: updatedMin.toISOString(),
      singleEvents: 'true',
      orderBy: 'updated',
      maxResults: '2500',
      showDeleted: 'true',
    })

    const result = await this.request<{ items?: GoogleEventResponse[] }>(
      `/calendars/${encodeURIComponent(this.calendarId)}/events?${params}`,
    )

    return (result.items ?? []).map((item) => this.fromGoogleEvent(item))
  }

  async watchCalendar(webhookUrl: string, channelId: string): Promise<CalendarWatchResult> {
    const result = await this.request<{
      id: string
      resourceId: string
      expiration: string
    }>(
      `/calendars/${encodeURIComponent(this.calendarId)}/events/watch`,
      {
        method: 'POST',
        body: JSON.stringify({
          id: channelId,
          type: 'web_hook',
          address: webhookUrl,
        }),
      },
    )

    return {
      channelId: result.id,
      resourceId: result.resourceId,
      expiration: new Date(Number(result.expiration)).toISOString(),
    }
  }

  async stopWatch(channelId: string, resourceId: string): Promise<void> {
    await this.request('/channels/stop', {
      method: 'POST',
      body: JSON.stringify({ id: channelId, resourceId }),
    })
  }

  private toGoogleEvent(
    event: CalendarEvent | Partial<CalendarEvent>,
    isPartial = false,
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {}

    if (event.title !== undefined) body.summary = event.title
    if (event.description !== undefined) body.description = event.description
    if (event.location !== undefined) body.location = event.location

    if (event.startDate !== undefined) {
      body.start = {
        dateTime: event.startDate instanceof Date ? event.startDate.toISOString() : event.startDate,
        timeZone: event.timeZone ?? 'America/Sao_Paulo',
      }
    }

    if (event.endDate !== undefined) {
      body.end = {
        dateTime: event.endDate instanceof Date ? event.endDate.toISOString() : event.endDate,
        timeZone: event.timeZone ?? 'America/Sao_Paulo',
      }
    }

    if (event.attendees !== undefined) {
      body.attendees = event.attendees.map((email) => ({ email }))
    }

    if (!isPartial) {
      body.reminders = { useDefault: true }
    }

    return body
  }

  private fromGoogleEvent(googleEvent: GoogleEventResponse): CalendarEvent {
    return {
      externalId: googleEvent.id,
      title: googleEvent.summary ?? '(Sem título)',
      description: googleEvent.description ?? null,
      startDate: new Date(googleEvent.start?.dateTime ?? googleEvent.start?.date ?? ''),
      endDate: new Date(googleEvent.end?.dateTime ?? googleEvent.end?.date ?? ''),
      timeZone: googleEvent.start?.timeZone ?? 'America/Sao_Paulo',
      attendees: googleEvent.attendees?.map((attendee) => attendee.email) ?? [],
      location: googleEvent.location,
      metadata: {
        status: googleEvent.status,
        htmlLink: googleEvent.htmlLink,
        updated: googleEvent.updated,
      },
    }
  }
}
