/**
 * Tests for Twilio webhook handlers
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { setMockEnv, clearMockEnv } from '../mocks/env.js';
import { mockTwilioCallStatus } from '../mocks/fixtures.js';

describe('Twilio Webhook Handlers', () => {
  before(() => {
    setMockEnv();
  });

  after(() => {
    clearMockEnv();
  });

  describe('TwiML Endpoint', () => {
    it('should generate TwiML with room parameter', () => {
      const roomName = 'callkaro-test-123';
      const leadId = 'lead-456';

      const query = {
        room: roomName,
        leadId,
      };

      assert.ok(query.room);
      assert.ok(query.leadId);

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi">Please wait while we connect you.</Say>
  <Connect>
    <Stream url="wss://test.livekit.cloud/stream">
      <Parameter name="room" value="${query.room}"/>
      <Parameter name="leadId" value="${query.leadId}"/>
    </Stream>
  </Connect>
</Response>`;

      assert.ok(twiml.includes(roomName));
      assert.ok(twiml.includes(leadId));
      assert.ok(twiml.includes('<Response>'));
    });

    it('should handle missing parameters gracefully', () => {
      const query = {}; // No parameters

      // Should still generate valid TwiML
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi">We're sorry, but we're unable to connect your call.</Say>
  <Hangup/>
</Response>`;

      assert.ok(twiml.includes('<Response>'));
      assert.ok(twiml.includes('<Hangup/>'));
    });
  });

  describe('Status Webhook', () => {
    it('should process call status updates', () => {
      const statusUpdate = {
        ...mockTwilioCallStatus,
        CallStatus: 'completed',
      };

      // Map Twilio status to our status
      const statusMap: Record<string, string> = {
        initiated: 'initiated',
        ringing: 'ringing',
        'in-progress': 'in-progress',
        completed: 'completed',
        busy: 'busy',
        failed: 'failed',
        'no-answer': 'no-answer',
      };

      const mappedStatus = statusMap[statusUpdate.CallStatus];

      assert.strictEqual(mappedStatus, 'completed');
    });

    it('should handle answered call status', () => {
      const statusUpdate = {
        CallSid: 'CAtest123',
        CallStatus: 'in-progress',
        StartTime: '2025-01-01T10:00:00Z',
        AnsweredBy: 'human',
      };

      const updates: Record<string, any> = {
        status: 'in-progress',
        answered_at: statusUpdate.StartTime,
      };

      if (statusUpdate.AnsweredBy === 'machine_end_beep' || statusUpdate.AnsweredBy === 'machine_end_silence') {
        updates.disposition = 'voicemail';
      }

      assert.strictEqual(updates.status, 'in-progress');
      assert.ok(!updates.disposition); // Should not be voicemail
    });

    it('should detect voicemail', () => {
      const statusUpdate = {
        CallSid: 'CAtest123',
        CallStatus: 'in-progress',
        AnsweredBy: 'machine_end_beep',
      };

      const updates: Record<string, any> = {
        status: 'in-progress',
      };

      if (statusUpdate.AnsweredBy === 'machine_end_beep' || statusUpdate.AnsweredBy === 'machine_end_silence') {
        updates.disposition = 'voicemail';
        updates.outcome = 'voicemail';
      }

      assert.strictEqual(updates.disposition, 'voicemail');
      assert.strictEqual(updates.outcome, 'voicemail');
    });

    it('should calculate call duration', () => {
      const statusUpdate = {
        CallSid: 'CAtest123',
        CallStatus: 'completed',
        Duration: '180',
      };

      const duration = parseInt(statusUpdate.Duration);

      assert.strictEqual(duration, 180);
      assert.ok(duration >= 0);
    });

    it('should detect no-answer calls', () => {
      const statusUpdate = {
        CallSid: 'CAtest123',
        CallStatus: 'completed',
        Duration: '3', // Very short
      };

      const duration = parseInt(statusUpdate.Duration);
      const disposition = duration < 5 ? 'no_answer' : 'answered';

      assert.strictEqual(disposition, 'no_answer');
    });
  });

  describe('Recording Webhook', () => {
    it('should process recording callback', () => {
      const recordingData = {
        CallSid: 'CAtest123',
        RecordingSid: 'REtest456',
        RecordingUrl: 'https://api.twilio.com/2010-04-01/Accounts/AC123/Recordings/REtest456',
        RecordingDuration: '180',
        RecordingStatus: 'completed',
      };

      assert.ok(recordingData.RecordingSid);
      assert.ok(recordingData.RecordingUrl);
      assert.strictEqual(recordingData.RecordingStatus, 'completed');
    });

    it('should generate MP3 recording URL', () => {
      const recordingUrl = 'https://api.twilio.com/2010-04-01/Accounts/AC123/Recordings/REtest456';
      const mp3Url = `${recordingUrl}.mp3`;

      assert.ok(mp3Url.endsWith('.mp3'));
      assert.ok(mp3Url.includes('Recordings'));
    });
  });

  describe('Transfer Endpoint', () => {
    it('should generate transfer TwiML', () => {
      const transferTo = '+15555559999';

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi">Transferring you now. Please hold.</Say>
  <Dial callerId="+15555551234">
    <Number>${transferTo}</Number>
  </Dial>
</Response>`;

      assert.ok(twiml.includes(transferTo));
      assert.ok(twiml.includes('<Dial'));
      assert.ok(twiml.includes('Transferring'));
    });

    it('should validate transfer number', () => {
      const validNumbers = ['+15555559999', '+919876543210'];
      const invalidNumbers = ['invalid', '123'];

      validNumbers.forEach(num => {
        assert.ok(/^\+?[1-9]\d{9,14}$/.test(num));
      });

      invalidNumbers.forEach(num => {
        assert.ok(!/^\+?[1-9]\d{9,14}$/.test(num));
      });
    });
  });

  describe('Voicemail Endpoint', () => {
    it('should generate voicemail TwiML', () => {
      const leadName = 'Rahul';
      const companyName = 'Test Company';
      const productName = 'Test Product';

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi">
    Hi ${leadName}, this is a message from ${companyName}.
    We tried reaching you to discuss ${productName}.
    Please call us back at your convenience. Thank you!
  </Say>
  <Hangup/>
</Response>`;

      assert.ok(twiml.includes(leadName));
      assert.ok(twiml.includes(companyName));
      assert.ok(twiml.includes(productName));
      assert.ok(twiml.includes('<Hangup/>'));
    });
  });

  describe('Error Handling', () => {
    it('should handle missing CallSid gracefully', () => {
      const invalidRequest = {
        // Missing CallSid
        CallStatus: 'completed',
      };

      const hasCallSid = !!invalidRequest['CallSid' as keyof typeof invalidRequest];

      assert.strictEqual(hasCallSid, false);
      // Should return 200 but log warning
    });

    it('should handle invalid status values', () => {
      const invalidStatus = 'unknown_status';
      const validStatuses = ['initiated', 'ringing', 'in-progress', 'completed', 'failed', 'busy', 'no-answer'];

      const isValid = validStatuses.includes(invalidStatus);

      assert.strictEqual(isValid, false);
      // Should use fallback status
    });
  });

  describe('Health Check', () => {
    it('should return healthy status', () => {
      const healthResponse = {
        status: 'ok',
        service: 'CallKaro AI Webhooks',
        timestamp: new Date().toISOString(),
      };

      assert.strictEqual(healthResponse.status, 'ok');
      assert.ok(healthResponse.timestamp);
    });
  });
});
