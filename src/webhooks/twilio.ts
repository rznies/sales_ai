/**
 * Twilio Webhook Handlers for CallKaro AI
 * Handles TwiML generation and call status updates
 */

import express, { Request, Response } from 'express';
import { getTwilioService } from '../integrations/twilio.js';
import { supabase } from '../integrations/supabase.js';

const router = express.Router();

/**
 * TwiML endpoint - serves TwiML for incoming calls
 * This connects Twilio calls to LiveKit rooms
 */
router.post('/twiml', async (req: Request, res: Response) => {
  try {
    const { room, leadId, callId } = req.query;

    console.log('📞 TwiML requested for room:', room);

    // Get lead info if available
    let leadInfo = null;
    if (leadId && typeof leadId === 'string') {
      leadInfo = await supabase.getLeadById(leadId);
    }

    // Generate TwiML that connects to LiveKit
    const twilioService = getTwilioService();
    const twiml = twilioService.generateTwiMLForLiveKit(room as string, leadInfo || undefined);

    res.type('text/xml');
    res.send(twiml);
  } catch (error: any) {
    console.error('❌ TwiML generation error:', error.message);

    // Fallback TwiML
    const fallbackTwiML = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi">We're sorry, but we're unable to connect your call at this time. Please try again later.</Say>
  <Hangup/>
</Response>`;

    res.type('text/xml');
    res.send(fallbackTwiML);
  }
});

/**
 * Call status webhook - receives call status updates from Twilio
 */
router.post('/status', async (req: Request, res: Response) => {
  try {
    const {
      CallSid,
      CallStatus,
      Duration,
      StartTime,
      EndTime,
      AnsweredBy,
      From,
      To,
    } = req.body;

    console.log(`📊 Call status update: ${CallSid} -> ${CallStatus}`);

    // Find call record in Supabase
    const callRecord = await supabase.getCallByTwilioSid(CallSid);

    if (!callRecord) {
      console.warn(`⚠️  No call record found for SID: ${CallSid}`);
      return res.sendStatus(200);
    }

    // Map Twilio status to our status
    const statusMap: Record<string, any> = {
      initiated: 'initiated',
      ringing: 'ringing',
      'in-progress': 'in-progress',
      completed: 'completed',
      busy: 'busy',
      failed: 'failed',
      'no-answer': 'no-answer',
      canceled: 'canceled',
    };

    const updates: any = {
      status: statusMap[CallStatus] || CallStatus,
    };

    // Handle different status updates
    switch (CallStatus) {
      case 'ringing':
        // Call is ringing
        break;

      case 'in-progress':
        updates.answered_at = StartTime ? new Date(StartTime).toISOString() : new Date().toISOString();

        // Check if answered by machine
        if (AnsweredBy === 'machine_end_beep' || AnsweredBy === 'machine_end_silence') {
          updates.disposition = 'voicemail';
          updates.outcome = 'voicemail';
        }
        break;

      case 'completed':
        updates.ended_at = EndTime ? new Date(EndTime).toISOString() : new Date().toISOString();
        updates.duration_seconds = Duration ? parseInt(Duration) : 0;

        // Set disposition based on duration
        if (Duration && parseInt(Duration) < 5) {
          updates.disposition = 'no_answer';
        } else {
          updates.disposition = 'answered';
        }
        break;

      case 'busy':
        updates.disposition = 'busy';
        updates.ended_at = new Date().toISOString();
        break;

      case 'no-answer':
        updates.disposition = 'no_answer';
        updates.outcome = 'no_answer';
        updates.ended_at = new Date().toISOString();
        break;

      case 'failed':
        updates.disposition = 'failed';
        updates.ended_at = new Date().toISOString();
        updates.error_message = 'Call failed';
        break;

      case 'canceled':
        updates.disposition = 'canceled';
        updates.ended_at = new Date().toISOString();
        break;
    }

    // Update call record
    await supabase.updateCall(callRecord.id!, updates);

    // Update lead status if applicable
    if (callRecord.lead_id && CallStatus === 'in-progress') {
      await supabase.updateLeadStatus(callRecord.lead_id, 'calling');
    }

    if (callRecord.lead_id && ['completed', 'busy', 'no-answer', 'failed'].includes(CallStatus)) {
      await supabase.updateLeadStatus(callRecord.lead_id, 'called');
    }

    res.sendStatus(200);
  } catch (error: any) {
    console.error('❌ Status webhook error:', error.message);
    res.sendStatus(500);
  }
});

/**
 * Recording webhook - receives recording URLs from Twilio
 */
router.post('/recording', async (req: Request, res: Response) => {
  try {
    const {
      CallSid,
      RecordingSid,
      RecordingUrl,
      RecordingDuration,
      RecordingStatus,
    } = req.body;

    console.log(`🎙️  Recording ready: ${RecordingSid} for call ${CallSid}`);

    // Find call record
    const callRecord = await supabase.getCallByTwilioSid(CallSid);

    if (!callRecord) {
      console.warn(`⚠️  No call record found for SID: ${CallSid}`);
      return res.sendStatus(200);
    }

    // Update call with recording info
    if (RecordingStatus === 'completed') {
      const recordingUrlWithAuth = `${RecordingUrl}.mp3`;

      await supabase.updateCall(callRecord.id!, {
        recording_url: recordingUrlWithAuth,
        recording_duration: RecordingDuration ? parseInt(RecordingDuration) : undefined,
      });

      console.log(`✅ Recording saved for call ${callRecord.id}`);
    }

    res.sendStatus(200);
  } catch (error: any) {
    console.error('❌ Recording webhook error:', error.message);
    res.sendStatus(500);
  }
});

/**
 * Transfer endpoint - handles call transfers
 */
router.post('/transfer', async (req: Request, res: Response) => {
  try {
    const { transferTo } = req.query;

    if (!transferTo || typeof transferTo !== 'string') {
      throw new Error('Transfer number not provided');
    }

    console.log(`🔄 Transferring call to ${transferTo}`);

    // Generate TwiML for transfer
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi">Transferring you now. Please hold.</Say>
  <Dial callerId="${process.env.TWILIO_PHONE_NUMBER}">
    <Number>${transferTo}</Number>
  </Dial>
</Response>`;

    res.type('text/xml');
    res.send(twiml);
  } catch (error: any) {
    console.error('❌ Transfer error:', error.message);

    const errorTwiML = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi">Sorry, we couldn't complete the transfer. Please try again later.</Say>
  <Hangup/>
</Response>`;

    res.type('text/xml');
    res.send(errorTwiML);
  }
});

/**
 * Voicemail endpoint - handles voicemail scenarios
 */
router.post('/voicemail', async (req: Request, res: Response) => {
  try {
    const { leadName } = req.query;

    const twilioService = getTwilioService();
    const twiml = twilioService.generateVoicemailTwiML(leadName as string);

    res.type('text/xml');
    res.send(twiml);
  } catch (error: any) {
    console.error('❌ Voicemail TwiML error:', error.message);
    res.sendStatus(500);
  }
});

/**
 * Health check endpoint
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'CallKaro AI Webhooks',
    timestamp: new Date().toISOString(),
  });
});

export default router;
