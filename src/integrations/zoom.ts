/**
 * Zoom Integration for CallKaro AI
 * Create Zoom meetings for scheduled demos
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

export interface ZoomMeetingDetails {
  topic: string;
  start_time: Date;
  duration: number; // in minutes
  agenda?: string;
  attendee_email?: string;
  attendee_name?: string;
}

export interface ZoomMeeting {
  id: string;
  join_url: string;
  start_url: string;
  password: string;
  start_time: Date;
  duration: number;
  topic: string;
}

/**
 * Zoom Service
 */
export class ZoomService {
  private accountId: string;
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.accountId = process.env.ZOOM_ACCOUNT_ID || '';
    this.clientId = process.env.ZOOM_CLIENT_ID || '';
    this.clientSecret = process.env.ZOOM_CLIENT_SECRET || '';

    if (!this.accountId || !this.clientId || !this.clientSecret) {
      console.warn('⚠️  Zoom credentials not configured. Meeting creation will fail.');
    }
  }

  /**
   * Get OAuth access token using Server-to-Server OAuth
   */
  private async getAccessToken(): Promise<string> {
    // Check if token is still valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(
        'https://zoom.us/oauth/token',
        new URLSearchParams({
          grant_type: 'account_credentials',
          account_id: this.accountId,
        }),
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = response.data.access_token;
      // Set expiry to 5 minutes before actual expiry for safety
      this.tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;

      return this.accessToken;
    } catch (error: any) {
      console.error('Zoom OAuth error:', error.response?.data || error.message);
      throw new Error('Failed to get Zoom access token');
    }
  }

  /**
   * Create a Zoom meeting
   */
  async createMeeting(details: ZoomMeetingDetails): Promise<ZoomMeeting> {
    try {
      const token = await this.getAccessToken();

      const meetingData = {
        topic: details.topic,
        type: 2, // Scheduled meeting
        start_time: details.start_time.toISOString(),
        duration: details.duration,
        timezone: 'Asia/Kolkata',
        agenda: details.agenda || '',
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: true,
          mute_upon_entry: false,
          watermark: false,
          use_pmi: false,
          approval_type: 0, // Automatically approve
          audio: 'both', // Telephony and VoIP
          auto_recording: 'cloud', // Auto record to cloud
          enforce_login: false,
          waiting_room: false,
          meeting_authentication: false,
        },
      };

      const response = await axios.post(
        'https://api.zoom.us/v2/users/me/meetings',
        meetingData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const meeting = response.data;

      return {
        id: meeting.id.toString(),
        join_url: meeting.join_url,
        start_url: meeting.start_url,
        password: meeting.password || '',
        start_time: new Date(meeting.start_time),
        duration: meeting.duration,
        topic: meeting.topic,
      };
    } catch (error: any) {
      console.error('Zoom meeting creation error:', error.response?.data || error.message);
      throw new Error(`Failed to create Zoom meeting: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Update a Zoom meeting
   */
  async updateMeeting(meetingId: string, updates: Partial<ZoomMeetingDetails>): Promise<ZoomMeeting> {
    try {
      const token = await this.getAccessToken();

      const updateData: any = {};
      if (updates.topic) updateData.topic = updates.topic;
      if (updates.start_time) updateData.start_time = updates.start_time.toISOString();
      if (updates.duration) updateData.duration = updates.duration;
      if (updates.agenda) updateData.agenda = updates.agenda;

      await axios.patch(
        `https://api.zoom.us/v2/meetings/${meetingId}`,
        updateData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Fetch updated meeting details
      return await this.getMeeting(meetingId);
    } catch (error: any) {
      console.error('Zoom meeting update error:', error.response?.data || error.message);
      throw new Error(`Failed to update Zoom meeting: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get Zoom meeting details
   */
  async getMeeting(meetingId: string): Promise<ZoomMeeting> {
    try {
      const token = await this.getAccessToken();

      const response = await axios.get(
        `https://api.zoom.us/v2/meetings/${meetingId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const meeting = response.data;

      return {
        id: meeting.id.toString(),
        join_url: meeting.join_url,
        start_url: meeting.start_url,
        password: meeting.password || '',
        start_time: new Date(meeting.start_time),
        duration: meeting.duration,
        topic: meeting.topic,
      };
    } catch (error: any) {
      console.error('Zoom meeting fetch error:', error.response?.data || error.message);
      throw new Error(`Failed to get Zoom meeting: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Delete a Zoom meeting
   */
  async deleteMeeting(meetingId: string): Promise<void> {
    try {
      const token = await this.getAccessToken();

      await axios.delete(
        `https://api.zoom.us/v2/meetings/${meetingId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } catch (error: any) {
      console.error('Zoom meeting deletion error:', error.response?.data || error.message);
      throw new Error(`Failed to delete Zoom meeting: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * List upcoming meetings
   */
  async listMeetings(): Promise<ZoomMeeting[]> {
    try {
      const token = await this.getAccessToken();

      const response = await axios.get(
        'https://api.zoom.us/v2/users/me/meetings',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            type: 'upcoming',
            page_size: 30,
          },
        }
      );

      const meetings = response.data.meetings || [];

      return meetings.map((m: any) => ({
        id: m.id.toString(),
        join_url: m.join_url,
        start_url: m.start_url,
        password: m.password || '',
        start_time: new Date(m.start_time),
        duration: m.duration,
        topic: m.topic,
      }));
    } catch (error: any) {
      console.error('Zoom meetings list error:', error.response?.data || error.message);
      throw new Error(`Failed to list Zoom meetings: ${error.response?.data?.message || error.message}`);
    }
  }
}

/**
 * Helper function to create meeting topic
 */
export function createZoomTopic(params: {
  prospectName: string;
  companyName: string;
  productName: string;
}): string {
  return `${params.productName} Demo - ${params.prospectName} (${params.companyName})`;
}

/**
 * Helper function to create meeting agenda
 */
export function createZoomAgenda(params: {
  productName: string;
  duration: number;
  notes?: string;
}): string {
  return `${params.productName} Demo Call (${params.duration} min)

Agenda:
- Introduction and overview
- ${params.productName} demonstration
- Q&A and discussion
- Next steps

${params.notes ? `Notes: ${params.notes}` : ''}

Powered by CallKaro AI 🚀`;
}

/**
 * Export singleton instance (lazy initialization)
 */
let zoomServiceInstance: ZoomService | null = null;

export function getZoomService(): ZoomService {
  if (!zoomServiceInstance) {
    zoomServiceInstance = new ZoomService();
  }
  return zoomServiceInstance;
}
