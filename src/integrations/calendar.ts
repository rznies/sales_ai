/**
 * Google Calendar Integration for CallKaro AI
 * Handles meeting scheduling and calendar operations
 */

import { google, calendar_v3 } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

export interface MeetingDetails {
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  attendeeEmail: string;
  attendeeName: string;
  location?: string;
  conferenceData?: boolean;
}

export interface CalendarEvent {
  id: string;
  htmlLink: string;
  hangoutLink?: string;
  meetLink?: string;
  startTime: Date;
  endTime: Date;
}

/**
 * Google Calendar Service
 */
export class GoogleCalendarService {
  private calendar: calendar_v3.Calendar;
  private oauth2Client: any;

  constructor() {
    const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI || 'http://localhost:3000/oauth2callback';
    const refreshToken = process.env.GOOGLE_CALENDAR_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error('Google Calendar credentials not configured. Please set GOOGLE_CALENDAR_* env variables.');
    }

    // Initialize OAuth2 client
    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // Set refresh token
    this.oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    // Initialize Calendar API
    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Create a calendar event
   */
  async createEvent(details: MeetingDetails): Promise<CalendarEvent> {
    try {
      const event: calendar_v3.Schema$Event = {
        summary: details.title,
        description: details.description,
        start: {
          dateTime: details.startTime.toISOString(),
          timeZone: 'Asia/Kolkata', // Indian Standard Time
        },
        end: {
          dateTime: details.endTime.toISOString(),
          timeZone: 'Asia/Kolkata',
        },
        attendees: [
          {
            email: details.attendeeEmail,
            displayName: details.attendeeName,
            responseStatus: 'needsAction',
          },
        ],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 30 }, // 30 minutes before
          ],
        },
        // Optional: Add location
        location: details.location,
      };

      // Add Google Meet if requested
      if (details.conferenceData) {
        event.conferenceData = {
          createRequest: {
            requestId: `callkaro-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        };
      }

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
        conferenceDataVersion: details.conferenceData ? 1 : undefined,
        sendUpdates: 'all', // Send email invites to attendees
      });

      const createdEvent = response.data;

      return {
        id: createdEvent.id!,
        htmlLink: createdEvent.htmlLink!,
        hangoutLink: createdEvent.hangoutLink,
        meetLink: createdEvent.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video')?.uri,
        startTime: new Date(createdEvent.start!.dateTime!),
        endTime: new Date(createdEvent.end!.dateTime!),
      };
    } catch (error: any) {
      console.error('Google Calendar API error:', error.message);
      throw new Error(`Failed to create calendar event: ${error.message}`);
    }
  }

  /**
   * Update an existing calendar event
   */
  async updateEvent(eventId: string, updates: Partial<MeetingDetails>): Promise<CalendarEvent> {
    try {
      const event: calendar_v3.Schema$Event = {};

      if (updates.title) event.summary = updates.title;
      if (updates.description) event.description = updates.description;
      if (updates.startTime) {
        event.start = {
          dateTime: updates.startTime.toISOString(),
          timeZone: 'Asia/Kolkata',
        };
      }
      if (updates.endTime) {
        event.end = {
          dateTime: updates.endTime.toISOString(),
          timeZone: 'Asia/Kolkata',
        };
      }

      const response = await this.calendar.events.patch({
        calendarId: 'primary',
        eventId: eventId,
        requestBody: event,
        sendUpdates: 'all',
      });

      const updatedEvent = response.data;

      return {
        id: updatedEvent.id!,
        htmlLink: updatedEvent.htmlLink!,
        hangoutLink: updatedEvent.hangoutLink,
        meetLink: updatedEvent.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video')?.uri,
        startTime: new Date(updatedEvent.start!.dateTime!),
        endTime: new Date(updatedEvent.end!.dateTime!),
      };
    } catch (error: any) {
      console.error('Google Calendar update error:', error.message);
      throw new Error(`Failed to update calendar event: ${error.message}`);
    }
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(eventId: string): Promise<void> {
    try {
      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
        sendUpdates: 'all',
      });
    } catch (error: any) {
      console.error('Google Calendar delete error:', error.message);
      throw new Error(`Failed to delete calendar event: ${error.message}`);
    }
  }

  /**
   * Get event details
   */
  async getEvent(eventId: string): Promise<CalendarEvent> {
    try {
      const response = await this.calendar.events.get({
        calendarId: 'primary',
        eventId: eventId,
      });

      const event = response.data;

      return {
        id: event.id!,
        htmlLink: event.htmlLink!,
        hangoutLink: event.hangoutLink,
        meetLink: event.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video')?.uri,
        startTime: new Date(event.start!.dateTime!),
        endTime: new Date(event.end!.dateTime!),
      };
    } catch (error: any) {
      console.error('Google Calendar get error:', error.message);
      throw new Error(`Failed to get calendar event: ${error.message}`);
    }
  }

  /**
   * Check if time slot is available
   */
  async isTimeSlotAvailable(startTime: Date, endTime: Date): Promise<boolean> {
    try {
      const response = await this.calendar.freebusy.query({
        requestBody: {
          timeMin: startTime.toISOString(),
          timeMax: endTime.toISOString(),
          items: [{ id: 'primary' }],
        },
      });

      const busy = response.data.calendars?.primary?.busy || [];
      return busy.length === 0;
    } catch (error: any) {
      console.error('Google Calendar freebusy error:', error.message);
      // If error, assume slot is available
      return true;
    }
  }

  /**
   * Get next available slot
   */
  async getNextAvailableSlot(durationMinutes: number, preferredStartHour: number = 10): Promise<Date> {
    const now = new Date();
    let currentDate = new Date(now);
    currentDate.setHours(preferredStartHour, 0, 0, 0);

    // Skip weekends
    while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Try next 7 days
    for (let day = 0; day < 7; day++) {
      for (let hour = preferredStartHour; hour < 18; hour++) {
        // 10 AM to 6 PM
        const slotStart = new Date(currentDate);
        slotStart.setHours(hour, 0, 0, 0);

        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + durationMinutes);

        if (await this.isTimeSlotAvailable(slotStart, slotEnd)) {
          return slotStart;
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
      // Skip weekends
      while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    // If no slot found, return tomorrow at preferred hour
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(preferredStartHour, 0, 0, 0);
    return tomorrow;
  }
}

/**
 * Helper function to parse date/time from various formats
 */
export function parseDateTime(dateStr: string, timeStr?: string): Date {
  const date = new Date(dateStr);

  if (timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    date.setHours(hours, minutes, 0, 0);
  }

  return date;
}

/**
 * Helper function to create meeting description
 */
export function createMeetingDescription(params: {
  prospectName: string;
  companyName: string;
  productName: string;
  notes?: string;
}): string {
  const { prospectName, companyName, productName, notes } = params;

  return `Demo Call with ${prospectName}

This is a demo call to showcase ${productName}.

Company: ${companyName}

${notes ? `Notes: ${notes}` : ''}

Looking forward to the call!

---
Scheduled by CallKaro AI 🚀`;
}

/**
 * Export singleton instance (lazy initialization)
 */
let calendarServiceInstance: GoogleCalendarService | null = null;

export function getGoogleCalendarService(): GoogleCalendarService {
  if (!calendarServiceInstance) {
    calendarServiceInstance = new GoogleCalendarService();
  }
  return calendarServiceInstance;
}
