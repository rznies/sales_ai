/**
 * Twilio Integration for CallKaro AI
 * Handles outbound calling via Twilio Programmable Voice
 * Bridges Twilio calls with LiveKit for real-time AI conversations
 */

import twilio from 'twilio';
import dotenv from 'dotenv';
import { supabase, Lead, Call } from './supabase.js';

dotenv.config({ path: '.env.local' });

export interface OutboundCallParams {
  to: string; // Phone number to call
  leadId?: string; // Associated lead ID
  customParameters?: Record<string, string>;
}

export interface CallStatus {
  sid: string;
  status: 'queued' | 'ringing' | 'in-progress' | 'completed' | 'failed' | 'busy' | 'no-answer' | 'canceled';
  duration?: number;
  startTime?: Date;
  endTime?: Date;
  price?: string;
  priceUnit?: string;
}

/**
 * Twilio Service for CallKaro AI
 */
export class TwilioService {
  private client: twilio.Twilio;
  private phoneNumber: string;
  private webhookUrl: string;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.phoneNumber = process.env.TWILIO_PHONE_NUMBER || '';
    this.webhookUrl = process.env.TWILIO_WEBHOOK_URL || '';

    if (!accountSid || !authToken || !this.phoneNumber) {
      throw new Error('Twilio credentials not configured. Please set TWILIO_* env variables.');
    }

    this.client = twilio(accountSid, authToken);
  }

  /**
   * Make an outbound call to a lead
   */
  async makeCall(params: OutboundCallParams): Promise<string> {
    try {
      console.log(`📞 Initiating call to ${params.to}...`);

      // Create call record in Supabase first
      let callRecord: Call | null = null;

      if (params.leadId) {
        callRecord = await supabase.createCall({
          lead_id: params.leadId,
          status: 'initiated',
          direction: 'outbound',
          started_at: new Date().toISOString(),
        });
      }

      // Generate LiveKit room name for this call
      const roomName = `callkaro-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Build TwiML webhook URL with parameters
      const twimlUrl = new URL(`${this.webhookUrl}/twiml`);
      twimlUrl.searchParams.set('room', roomName);
      if (params.leadId) twimlUrl.searchParams.set('leadId', params.leadId);
      if (callRecord?.id) twimlUrl.searchParams.set('callId', callRecord.id);

      // Add custom parameters
      if (params.customParameters) {
        Object.entries(params.customParameters).forEach(([key, value]) => {
          twimlUrl.searchParams.set(key, value);
        });
      }

      // Make the call using Twilio
      const call = await this.client.calls.create({
        to: params.to,
        from: this.phoneNumber,
        url: twimlUrl.toString(),
        statusCallback: `${this.webhookUrl}/status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST',
        record: true, // Enable call recording
        recordingStatusCallback: `${this.webhookUrl}/recording`,
        recordingStatusCallbackMethod: 'POST',
        timeout: 30, // Ring for 30 seconds max
        machineDetection: 'DetectMessageEnd', // Detect if answered by voicemail
        machineDetectionTimeout: 5,
      });

      console.log(`✅ Call initiated. SID: ${call.sid}`);

      // Update call record with Twilio SID and LiveKit room
      if (callRecord) {
        await supabase.updateCall(callRecord.id!, {
          twilio_call_sid: call.sid,
          livekit_room_name: roomName,
          status: 'initiated',
        });
      }

      return call.sid;
    } catch (error: any) {
      console.error('❌ Twilio call failed:', error.message);

      // Update call record with error
      if (params.leadId) {
        try {
          const existingCall = await supabase.getCallsByLeadId(params.leadId);
          if (existingCall.length > 0) {
            const lastCall = existingCall[0];
            await supabase.updateCall(lastCall.id!, {
              status: 'failed',
              error_message: error.message,
              ended_at: new Date().toISOString(),
            });
          }
        } catch (updateError) {
          console.error('Failed to update call record:', updateError);
        }
      }

      throw error;
    }
  }

  /**
   * Get call status from Twilio
   */
  async getCallStatus(callSid: string): Promise<CallStatus> {
    try {
      const call = await this.client.calls(callSid).fetch();

      return {
        sid: call.sid,
        status: call.status as any,
        duration: call.duration ? parseInt(call.duration) : undefined,
        startTime: call.startTime ? new Date(call.startTime) : undefined,
        endTime: call.endTime ? new Date(call.endTime) : undefined,
        price: call.price || undefined,
        priceUnit: call.priceUnit || undefined,
      };
    } catch (error: any) {
      console.error('❌ Failed to fetch call status:', error.message);
      throw error;
    }
  }

  /**
   * Hangup an ongoing call
   */
  async hangupCall(callSid: string): Promise<void> {
    try {
      await this.client.calls(callSid).update({
        status: 'completed',
      });

      console.log(`✅ Call ${callSid} hung up`);
    } catch (error: any) {
      console.error('❌ Failed to hangup call:', error.message);
      throw error;
    }
  }

  /**
   * Transfer call to a different number
   */
  async transferCall(callSid: string, transferTo: string): Promise<void> {
    try {
      // Create TwiML for transfer
      const twimlUrl = new URL(`${this.webhookUrl}/transfer`);
      twimlUrl.searchParams.set('transferTo', transferTo);

      await this.client.calls(callSid).update({
        url: twimlUrl.toString(),
        method: 'POST',
      });

      console.log(`✅ Call ${callSid} transferred to ${transferTo}`);
    } catch (error: any) {
      console.error('❌ Failed to transfer call:', error.message);
      throw error;
    }
  }

  /**
   * Get call recording URL
   */
  async getCallRecording(callSid: string): Promise<string | null> {
    try {
      const recordings = await this.client.recordings.list({
        callSid: callSid,
        limit: 1,
      });

      if (recordings.length > 0) {
        const recording = recordings[0];
        return `https://api.twilio.com${recording.uri.replace('.json', '.mp3')}`;
      }

      return null;
    } catch (error: any) {
      console.error('❌ Failed to fetch recording:', error.message);
      return null;
    }
  }

  /**
   * Send SMS (for follow-ups)
   */
  async sendSMS(to: string, message: string): Promise<string> {
    try {
      const sms = await this.client.messages.create({
        to: to,
        from: this.phoneNumber,
        body: message,
      });

      console.log(`✅ SMS sent to ${to}. SID: ${sms.sid}`);
      return sms.sid;
    } catch (error: any) {
      console.error('❌ Failed to send SMS:', error.message);
      throw error;
    }
  }

  /**
   * Generate TwiML for connecting call to LiveKit
   */
  generateTwiMLForLiveKit(roomName: string, leadInfo?: Partial<Lead>): string {
    const livekitUrl = process.env.LIVEKIT_URL || '';
    const apiKey = process.env.LIVEKIT_API_KEY || '';

    // In production, you'd generate a LiveKit token here
    // For now, we'll use the room name to join

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi">Please wait while we connect you.</Say>
  <Connect>
    <Stream url="${livekitUrl}/stream">
      <Parameter name="room" value="${roomName}"/>
      <Parameter name="apiKey" value="${apiKey}"/>
      ${leadInfo?.name ? `<Parameter name="leadName" value="${leadInfo.name}"/>` : ''}
      ${leadInfo?.id ? `<Parameter name="leadId" value="${leadInfo.id}"/>` : ''}
    </Stream>
  </Connect>
</Response>`;

    return twiml;
  }

  /**
   * Generate TwiML for voicemail detection
   */
  generateVoicemailTwiML(leadName?: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi">
    Hi${leadName ? ` ${leadName}` : ''}, this is a message from ${process.env.CALLKARO_COMPANY_NAME || 'our company'}.
    We tried reaching you to discuss ${process.env.CALLKARO_PRODUCT_NAME || 'an exciting opportunity'}.
    Please call us back at your convenience. Thank you!
  </Say>
  <Hangup/>
</Response>`;
  }

  /**
   * Validate phone number format
   */
  static validatePhoneNumber(phone: string): boolean {
    // Basic E.164 format validation for Indian numbers
    const phoneRegex = /^\+?[1-9]\d{9,14}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Format phone number to E.164
   */
  static formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // Add +91 for Indian numbers if not present
    if (cleaned.length === 10) {
      cleaned = '91' + cleaned;
    }

    // Add + prefix
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }

    return cleaned;
  }
}

/**
 * Export singleton instance
 */
let twilioServiceInstance: TwilioService | null = null;

export function getTwilioService(): TwilioService {
  if (!twilioServiceInstance) {
    twilioServiceInstance = new TwilioService();
  }
  return twilioServiceInstance;
}
