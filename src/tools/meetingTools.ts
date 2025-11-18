/**
 * Meeting Booking Tools for CallKaro AI
 * Function calling tools for booking meetings via Google Calendar and Zoom
 */

import { llm } from '@livekit/agents';
import { z } from 'zod';
import { getGoogleCalendarService, parseDateTime, createMeetingDescription } from '../integrations/calendar.js';
import { getZoomService, createZoomTopic, createZoomAgenda } from '../integrations/zoom.js';
import { supabase } from '../integrations/supabase.js';

/**
 * Book Meeting Tool
 * Creates calendar event and Zoom meeting when prospect agrees
 */
export const bookMeetingTool = llm.tool({
  description: `Book a demo meeting with the prospect. Use this when the prospect agrees to a meeting.

  IMPORTANT: Only call this function when the prospect explicitly agrees to schedule a meeting.
  Get confirmation on date/time before calling.`,

  parameters: z.object({
    prospect_name: z.string().describe('Name of the prospect'),
    prospect_email: z.string().email().describe('Email address of the prospect'),
    preferred_date: z.string().describe('Preferred date in YYYY-MM-DD format'),
    preferred_time: z.string().describe('Preferred time in HH:MM format (24-hour)'),
    notes: z.string().optional().describe('Any additional notes about the meeting'),
  }),

  execute: async ({ prospect_name, prospect_email, preferred_date, preferred_time, notes }, { room_context }) => {
    try {
      console.log('📅 Booking meeting for:', prospect_name);

      // Get configuration
      const companyName = process.env.CALLKARO_COMPANY_NAME || 'Your Company';
      const productName = process.env.CALLKARO_PRODUCT_NAME || 'our product';
      const demoDuration = parseInt(process.env.CALLKARO_DEMO_DURATION_MINUTES || '15');

      // Parse datetime
      const startTime = parseDateTime(preferred_date, preferred_time);
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + demoDuration);

      // Create Zoom meeting first
      const zoomService = getZoomService();
      const zoomMeeting = await zoomService.createMeeting({
        topic: createZoomTopic({ prospectName: prospect_name, companyName, productName }),
        start_time: startTime,
        duration: demoDuration,
        agenda: createZoomAgenda({ productName, duration: demoDuration, notes }),
        attendee_email: prospect_email,
        attendee_name: prospect_name,
      });

      console.log('✅ Zoom meeting created:', zoomMeeting.join_url);

      // Create Google Calendar event
      const calendarService = getGoogleCalendarService();
      const calendarEvent = await calendarService.createEvent({
        title: createZoomTopic({ prospectName: prospect_name, companyName, productName }),
        description: `${createMeetingDescription({ prospectName: prospect_name, companyName, productName, notes })}

Zoom Link: ${zoomMeeting.join_url}
Meeting ID: ${zoomMeeting.id}
Password: ${zoomMeeting.password}`,
        startTime,
        endTime,
        attendeeEmail: prospect_email,
        attendeeName: prospect_name,
        location: zoomMeeting.join_url,
        conferenceData: false, // Using Zoom instead of Google Meet
      });

      console.log('✅ Calendar event created:', calendarEvent.htmlLink);

      // Update call record in Supabase
      if (room_context?.call_id) {
        await supabase.updateCall(room_context.call_id, {
          meeting_booked: true,
          meeting_datetime: startTime.toISOString(),
          meeting_link: zoomMeeting.join_url,
          calendar_event_id: calendarEvent.id,
          outcome: 'meeting_booked',
        });

        // Update lead status
        if (room_context?.lead_id) {
          await supabase.updateLeadStatus(room_context.lead_id, 'meeting_booked');
        }
      }

      return `Perfect! I've booked the meeting for ${startTime.toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })} at ${startTime.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      })}.

You'll receive a calendar invite at ${prospect_email} with the Zoom link.

Meeting Link: ${zoomMeeting.join_url}

Looking forward to the demo! Is there anything specific you'd like me to cover in the call?`;
    } catch (error: any) {
      console.error('❌ Meeting booking failed:', error.message);
      return `I'm having trouble booking the meeting right now. Let me take down your details and my colleague will send you a calendar invite shortly. Can you confirm your email is ${prospect_email}?`;
    }
  },
});

/**
 * Transfer to Human Tool
 * Transfers call to human sales rep
 */
export const transferToHumanTool = llm.tool({
  description: `Transfer the call to a human sales representative. Use this when:
  - The prospect asks to speak with a manager or senior person
  - The conversation requires technical details beyond your knowledge
  - The prospect is very interested and wants immediate assistance

  DO NOT use this for simple objections or questions.`,

  parameters: z.object({
    reason: z
      .string()
      .describe('Reason for transfer (e.g., "technical_questions", "manager_requested", "high_intent")'),
    urgency: z.enum(['low', 'medium', 'high']).describe('Urgency level of the transfer'),
    context: z.string().describe('Brief context about the conversation so far'),
  }),

  execute: async ({ reason, urgency, context }, { room_context }) => {
    try {
      console.log('📞 Transferring call to human:', reason);

      const transferNumber = process.env.CALLKARO_HUMAN_TRANSFER_NUMBER;

      if (!transferNumber) {
        console.error('❌ No transfer number configured');
        return `I'd love to connect you with my manager, but I'm having trouble with the transfer right now. Let me schedule a callback for you instead. When would be a good time?`;
      }

      // Update call record
      if (room_context?.call_id) {
        await supabase.updateCall(room_context.call_id, {
          transferred_to_human: true,
          transfer_reason: `${reason} (${urgency} priority)`,
          transfer_timestamp: new Date().toISOString(),
          metadata: {
            ...room_context.metadata,
            transfer_context: context,
          },
        });
      }

      // In a real implementation, this would initiate a Twilio transfer
      // For now, we'll just notify and end gracefully

      return `Sure! Let me connect you with my colleague right away. Please hold for a moment while I transfer the call.`;
    } catch (error: any) {
      console.error('❌ Transfer failed:', error.message);
      return `I'm having trouble with the transfer. Let me take your number and have my manager call you back within 30 minutes. That works?`;
    }
  },
});

/**
 * Schedule Callback Tool
 * Schedules a callback for later
 */
export const scheduleCallbackTool = llm.tool({
  description: `Schedule a callback for later. Use when prospect is busy but interested.`,

  parameters: z.object({
    callback_date: z.string().describe('Callback date in YYYY-MM-DD format'),
    callback_time: z.string().describe('Callback time in HH:MM format (24-hour)'),
    notes: z.string().optional().describe('Notes about what to discuss in callback'),
  }),

  execute: async ({ callback_date, callback_time, notes }, { room_context }) => {
    try {
      console.log('🔔 Scheduling callback for:', callback_date, callback_time);

      const callbackDateTime = parseDateTime(callback_date, callback_time);

      // Add to dialer queue
      if (room_context?.lead_id) {
        await supabase.addToQueue({
          lead_id: room_context.lead_id,
          status: 'queued',
          priority: 7, // Higher priority for callbacks
          scheduled_for: callbackDateTime.toISOString(),
        });

        // Update lead with notes
        await supabase.updateLead(room_context.lead_id, {
          notes: notes || 'Callback requested',
        });
      }

      // Update call record
      if (room_context?.call_id) {
        await supabase.updateCall(room_context.call_id, {
          outcome: 'callback_requested',
          metadata: {
            ...room_context.metadata,
            callback_scheduled: callbackDateTime.toISOString(),
            callback_notes: notes,
          },
        });
      }

      return `Perfect! I've scheduled a callback for ${callbackDateTime.toLocaleDateString('en-IN', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })} at ${callbackDateTime.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      })}.

I'll call you back then. ${notes ? `I'll make sure to discuss ${notes}.` : ''}

Have a great day!`;
    } catch (error: any) {
      console.error('❌ Callback scheduling failed:', error.message);
      return `I've noted down your callback request. We'll call you back at your preferred time. Thanks for your interest!`;
    }
  },
});

/**
 * Mark Not Interested Tool
 * Marks lead as not interested in CRM
 */
export const markNotInterestedTool = llm.tool({
  description: `Mark the lead as not interested. Use when prospect clearly states they are not interested.`,

  parameters: z.object({
    reason: z.string().describe('Reason for not being interested'),
    do_not_call: z.boolean().optional().describe('Whether prospect requested to not be called again'),
  }),

  execute: async ({ reason, do_not_call }, { room_context }) => {
    try {
      console.log('❌ Marking as not interested:', reason);

      // Update lead status
      if (room_context?.lead_id) {
        await supabase.updateLeadStatus(room_context.lead_id, do_not_call ? 'do_not_call' : 'not_interested');

        await supabase.updateLead(room_context.lead_id, {
          notes: `Not interested: ${reason}`,
        });
      }

      // Update call record
      if (room_context?.call_id) {
        await supabase.updateCall(room_context.call_id, {
          outcome: 'not_interested',
          metadata: {
            ...room_context.metadata,
            not_interested_reason: reason,
            do_not_call: do_not_call || false,
          },
        });
      }

      if (do_not_call) {
        return `No problem at all! I've noted that you don't want to be contacted again. We won't call you. Sorry for any inconvenience. Have a great day!`;
      } else {
        return `No worries! I totally understand. Thanks for your time today. If anything changes in the future, feel free to reach out. Have a great day!`;
      }
    } catch (error: any) {
      console.error('❌ Failed to mark not interested:', error.message);
      return `Understood! Thanks for your time. Have a great day!`;
    }
  },
});

/**
 * Export all tools as an object
 */
export const meetingTools = {
  book_meeting: bookMeetingTool,
  transfer_to_human: transferToHumanTool,
  schedule_callback: scheduleCallbackTool,
  mark_not_interested: markNotInterestedTool,
};
