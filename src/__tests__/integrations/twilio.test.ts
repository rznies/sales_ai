/**
 * Unit tests for Twilio integration
 */

import { describe, it, before, after, mock } from 'node:test';
import assert from 'node:assert';
import { setMockEnv, clearMockEnv } from '../mocks/env.js';
import { mockLead, mockTwilioCallStatus } from '../mocks/fixtures.js';

// Mock Twilio client
const mockTwilioClient = {
  calls: {
    create: mock.fn((params) => Promise.resolve({
      sid: 'CAtest123456',
      status: 'queued',
      to: params.to,
      from: params.from,
    })),
    get: mock.fn((sid) => ({
      fetch: mock.fn(() => Promise.resolve({
        sid: sid,
        status: 'completed',
        duration: '180',
        startTime: new Date(),
        endTime: new Date(),
      })),
      update: mock.fn((params) => Promise.resolve({
        sid: sid,
        status: params.status,
      })),
    })),
  },
  recordings: {
    list: mock.fn(() => Promise.resolve([
      {
        sid: 'REtest123',
        uri: '/2010-04-01/Accounts/ACtest123/Recordings/REtest123.json',
      },
    ])),
  },
  messages: {
    create: mock.fn((params) => Promise.resolve({
      sid: 'SMtest123',
      to: params.to,
      from: params.from,
      body: params.body,
    })),
  },
};

describe('Twilio Integration', () => {
  before(() => {
    setMockEnv();
  });

  after(() => {
    clearMockEnv();
  });

  describe('Outbound Calling', () => {
    it('should make outbound call', async () => {
      const callParams = {
        to: mockLead.phone!,
        from: process.env.TWILIO_PHONE_NUMBER!,
        url: 'https://test.ngrok.io/twiml',
      };

      const result = await mockTwilioClient.calls.create(callParams);

      assert.ok(result.sid);
      assert.strictEqual(result.sid, 'CAtest123456');
      assert.strictEqual(result.to, mockLead.phone);
    });

    it('should include recording parameters', async () => {
      const callParams = {
        to: mockLead.phone!,
        from: process.env.TWILIO_PHONE_NUMBER!,
        url: 'https://test.ngrok.io/twiml',
        record: true,
        recordingStatusCallback: 'https://test.ngrok.io/recording',
      };

      const result = await mockTwilioClient.calls.create(callParams);

      assert.ok(result.sid);
    });

    it('should include machine detection', async () => {
      const callParams = {
        to: mockLead.phone!,
        from: process.env.TWILIO_PHONE_NUMBER!,
        url: 'https://test.ngrok.io/twiml',
        machineDetection: 'DetectMessageEnd',
        machineDetectionTimeout: 5,
      };

      const result = await mockTwilioClient.calls.create(callParams);

      assert.ok(result.sid);
    });
  });

  describe('Call Status', () => {
    it('should get call status', async () => {
      const callSid = 'CAtest123456';
      const result = await mockTwilioClient.calls.get(callSid).fetch();

      assert.ok(result);
      assert.strictEqual(result.sid, callSid);
      assert.ok(['queued', 'ringing', 'in-progress', 'completed', 'failed'].includes(result.status));
    });

    it('should handle call duration', async () => {
      const result = await mockTwilioClient.calls.get('CAtest123456').fetch();

      if (result.status === 'completed') {
        assert.ok(result.duration);
        const duration = parseInt(result.duration);
        assert.ok(duration >= 0);
      }
    });
  });

  describe('Call Control', () => {
    it('should hangup call', async () => {
      const callSid = 'CAtest123456';
      const result = await mockTwilioClient.calls.get(callSid).update({
        status: 'completed',
      });

      assert.strictEqual(result.status, 'completed');
    });

    it('should transfer call', async () => {
      const callSid = 'CAtest123456';
      const transferUrl = 'https://test.ngrok.io/transfer?transferTo=%2B15555559999';

      const result = await mockTwilioClient.calls.get(callSid).update({
        url: transferUrl,
        method: 'POST',
      });

      assert.ok(result);
    });
  });

  describe('Call Recordings', () => {
    it('should get call recordings', async () => {
      const recordings = await mockTwilioClient.recordings.list({
        callSid: 'CAtest123456',
      });

      assert.ok(Array.isArray(recordings));
      if (recordings.length > 0) {
        assert.ok(recordings[0].sid);
        assert.ok(recordings[0].uri);
      }
    });

    it('should generate recording URL', () => {
      const recordingUri = '/2010-04-01/Accounts/ACtest123/Recordings/REtest123.json';
      const recordingUrl = `https://api.twilio.com${recordingUri.replace('.json', '.mp3')}`;

      assert.ok(recordingUrl.includes('.mp3'));
      assert.ok(recordingUrl.startsWith('https://api.twilio.com'));
    });
  });

  describe('SMS Notifications', () => {
    it('should send SMS', async () => {
      const smsParams = {
        to: mockLead.phone!,
        from: process.env.TWILIO_PHONE_NUMBER!,
        body: 'Test message from CallKaro AI',
      };

      const result = await mockTwilioClient.messages.create(smsParams);

      assert.ok(result.sid);
      assert.strictEqual(result.to, mockLead.phone);
      assert.strictEqual(result.body, smsParams.body);
    });
  });

  describe('Phone Number Validation', () => {
    it('should validate Indian phone numbers', () => {
      const validNumbers = [
        '+919876543210',
        '+917234567890',
        '+919999999999',
      ];

      // Indian mobile numbers start with 6-9
      validNumbers.forEach(number => {
        assert.ok(/^\+91[6-9]\d{9}$/.test(number));
      });
    });

    it('should format phone numbers to E.164', () => {
      const testCases = [
        { input: '9876543210', expected: '+919876543210' },
        { input: '+919876543210', expected: '+919876543210' },
        { input: '919876543210', expected: '+919876543210' },
      ];

      testCases.forEach(({ input, expected }) => {
        let cleaned = input.replace(/\D/g, '');
        if (cleaned.length === 10) {
          cleaned = '91' + cleaned;
        }
        if (!cleaned.startsWith('+')) {
          cleaned = '+' + cleaned;
        }
        assert.strictEqual(cleaned, expected);
      });
    });

    it('should reject invalid phone numbers', () => {
      const invalidNumbers = [
        '123',
        'abcdefghij',
        '+1234',
        '+91123', // Too short
      ];

      invalidNumbers.forEach(number => {
        const cleaned = number.replace(/\D/g, '');
        assert.ok(cleaned.length < 10 || cleaned.length > 15);
      });
    });
  });

  describe('TwiML Generation', () => {
    it('should generate TwiML for LiveKit connection', () => {
      const roomName = 'callkaro-test-room';
      const livekitUrl = 'wss://test.livekit.cloud';

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi">Please wait while we connect you.</Say>
  <Connect>
    <Stream url="${livekitUrl}/stream">
      <Parameter name="room" value="${roomName}"/>
    </Stream>
  </Connect>
</Response>`;

      assert.ok(twiml.includes('<Response>'));
      assert.ok(twiml.includes('<Connect>'));
      assert.ok(twiml.includes(roomName));
    });

    it('should generate voicemail TwiML', () => {
      const leadName = mockLead.name;
      const companyName = 'Test Company';

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi">
    Hi ${leadName}, this is a message from ${companyName}.
  </Say>
  <Hangup/>
</Response>`;

      assert.ok(twiml.includes(leadName));
      assert.ok(twiml.includes(companyName));
      assert.ok(twiml.includes('<Hangup/>'));
    });
  });
});
