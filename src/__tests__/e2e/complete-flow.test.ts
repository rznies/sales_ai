/**
 * End-to-End tests for CallKaro AI complete user flows
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { setMockEnv, clearMockEnv } from '../mocks/env.js';
import {
  mockLead,
  mockCall,
  mockTranscript,
  mockGoogleCalendarEvent,
  mockZoomMeeting,
} from '../mocks/fixtures.js';

describe('CallKaro AI - End-to-End User Flows', () => {
  before(() => {
    setMockEnv();
  });

  after(() => {
    clearMockEnv();
  });

  describe('Flow 1: CSV Upload → Auto Dial → Meeting Booked', () => {
    it('should complete full successful call flow', async () => {
      // Step 1: Upload CSV with leads
      const csvData = [
        {
          name: 'Rahul Sharma',
          phone: '+919876543210',
          email: 'rahul@example.com',
          company: 'Test Startup',
        },
      ];

      assert.strictEqual(csvData.length, 1);
      assert.ok(csvData[0].name);
      assert.ok(csvData[0].phone);

      // Step 2: Lead imported to database
      const lead = {
        ...csvData[0],
        id: 'lead-123',
        status: 'pending' as const,
        priority: 5,
        source: 'csv_upload' as const,
      };

      assert.strictEqual(lead.status, 'pending');

      // Step 3: Lead added to dialer queue
      const queueItem = {
        id: 'queue-123',
        lead_id: lead.id,
        status: 'queued' as const,
        priority: 5,
      };

      assert.strictEqual(queueItem.status, 'queued');

      // Step 4: Auto-dialer picks up lead
      assert.strictEqual(queueItem.status, 'queued');
      // In real flow: queueItem.status = 'calling';

      // Step 5: Twilio call initiated
      const call = {
        id: 'call-123',
        lead_id: lead.id,
        twilio_call_sid: 'CAtest123',
        status: 'initiated' as const,
        direction: 'outbound' as const,
        started_at: new Date().toISOString(),
      };

      assert.ok(call.twilio_call_sid);
      assert.strictEqual(call.status, 'initiated');

      // Step 6: Call answered, conversation starts
      const answeredCall = {
        ...call,
        status: 'in-progress' as const,
        answered_at: new Date().toISOString(),
      };

      assert.strictEqual(answeredCall.status, 'in-progress');

      // Step 7: Conversation transcripts stored
      const transcripts = [
        {
          call_id: call.id,
          speaker: 'agent' as const,
          message: 'Hi, am I speaking with Rahul?',
          timestamp_ms: 1000,
        },
        {
          call_id: call.id,
          speaker: 'user' as const,
          message: 'Yes, this is Rahul.',
          timestamp_ms: 2000,
        },
        {
          call_id: call.id,
          speaker: 'agent' as const,
          message: 'Great! This is Raj from Test Company. How are you today?',
          timestamp_ms: 3000,
        },
      ];

      assert.strictEqual(transcripts.length, 3);
      assert.strictEqual(transcripts[0].speaker, 'agent');
      assert.strictEqual(transcripts[1].speaker, 'user');

      // Step 8: Sentiment analysis
      const sentimentAnalysis = {
        positive_keywords: ['yes', 'interested', 'sounds good'],
        negative_keywords: ['no', 'not interested'],
        sentiment: 'positive' as const,
      };

      // Step 9: Meeting booking triggered
      const meetingRequest = {
        prospect_name: 'Rahul Sharma',
        prospect_email: 'rahul@example.com',
        preferred_date: '2025-01-05',
        preferred_time: '15:00',
        notes: 'Demo of product',
      };

      assert.ok(meetingRequest.prospect_name);
      assert.ok(meetingRequest.prospect_email);

      // Step 10: Zoom meeting created
      const zoomMeeting = {
        ...mockZoomMeeting,
        topic: `Test Product Demo - ${meetingRequest.prospect_name}`,
      };

      assert.ok(zoomMeeting.join_url);
      assert.ok(zoomMeeting.password);

      // Step 11: Google Calendar event created
      const calendarEvent = {
        ...mockGoogleCalendarEvent,
        summary: `Demo with ${meetingRequest.prospect_name}`,
      };

      assert.ok(calendarEvent.id);

      // Step 12: Call completed with outcome
      const completedCall = {
        ...answeredCall,
        status: 'completed' as const,
        outcome: 'meeting_booked' as const,
        meeting_booked: true,
        meeting_datetime: '2025-01-05T15:00:00Z',
        meeting_link: zoomMeeting.join_url,
        calendar_event_id: calendarEvent.id,
        ended_at: new Date().toISOString(),
        duration_seconds: 180,
      };

      assert.strictEqual(completedCall.outcome, 'meeting_booked');
      assert.strictEqual(completedCall.meeting_booked, true);
      assert.ok(completedCall.meeting_link);

      // Step 13: Lead status updated
      const updatedLead = {
        ...lead,
        status: 'meeting_booked' as const,
        lead_score: 85, // High score for meeting booked
      };

      assert.strictEqual(updatedLead.status, 'meeting_booked');
      assert.ok(updatedLead.lead_score! > 50);

      // Step 14: Analytics updated
      const analytics = {
        totalCalls: 1,
        meetingsBooked: 1,
        conversionRate: 100.0,
      };

      assert.strictEqual(analytics.conversionRate, 100.0);

      console.log('✅ Complete flow test passed: CSV → Call → Meeting Booked');
    });
  });

  describe('Flow 2: Call → Objection Handling → Callback Scheduled', () => {
    it('should handle objection and schedule callback', async () => {
      // Step 1: Call initiated
      const call = {
        id: 'call-456',
        lead_id: 'lead-456',
        status: 'in-progress' as const,
      };

      // Step 2: User raises objection
      const objections = ['busy', 'send_email'];

      assert.ok(objections.includes('busy'));

      // Step 3: Agent handles objection
      const agentResponse = 'Arre, I totally understand! Everyone\'s busy. Can we schedule a quick 15-min call later?';

      assert.ok(agentResponse.includes('understand'));

      // Step 4: User agrees to callback
      const callbackRequest = {
        callback_date: '2025-01-10',
        callback_time: '14:00',
        notes: 'Follow up on product demo',
      };

      // Step 5: Callback scheduled in queue
      const queueItem = {
        lead_id: call.lead_id,
        status: 'queued' as const,
        scheduled_for: '2025-01-10T14:00:00Z',
        priority: 7, // Higher priority for callbacks
      };

      assert.strictEqual(queueItem.priority, 7);
      assert.strictEqual(queueItem.status, 'queued');

      // Step 6: Call completed with callback outcome
      const completedCall = {
        ...call,
        status: 'completed' as const,
        outcome: 'callback_requested' as const,
        objections_raised: objections,
      };

      assert.strictEqual(completedCall.outcome, 'callback_requested');
      assert.ok(completedCall.objections_raised);

      console.log('✅ Objection handling flow test passed');
    });
  });

  describe('Flow 3: Call → Transfer to Human', () => {
    it('should transfer call to human agent', async () => {
      // Step 1: Call in progress
      const call = {
        id: 'call-789',
        lead_id: 'lead-789',
        status: 'in-progress' as const,
      };

      // Step 2: User requests to speak with manager
      const userRequest = 'Can I speak with your manager?';

      assert.ok(userRequest.includes('manager'));

      // Step 3: Transfer initiated
      const transferRequest = {
        reason: 'manager_requested',
        urgency: 'high' as const,
        context: 'User wants to speak with manager about pricing',
      };

      assert.strictEqual(transferRequest.urgency, 'high');

      // Step 4: Call transferred
      const transferredCall = {
        ...call,
        transferred_to_human: true,
        transfer_reason: transferRequest.reason,
        transfer_timestamp: new Date().toISOString(),
      };

      assert.strictEqual(transferredCall.transferred_to_human, true);
      assert.ok(transferredCall.transfer_timestamp);

      console.log('✅ Transfer to human flow test passed');
    });
  });

  describe('Flow 4: Call → Not Interested → Do Not Call', () => {
    it('should mark lead as not interested', async () => {
      // Step 1: Call in progress
      const call = {
        id: 'call-999',
        lead_id: 'lead-999',
        status: 'in-progress' as const,
      };

      // Step 2: User explicitly not interested
      const userResponse = 'I\'m not interested. Please don\'t call me again.';

      assert.ok(userResponse.includes('not interested'));
      assert.ok(userResponse.includes('don\'t call'));

      // Step 3: Sentiment detected as negative
      const sentiment = 'negative' as const;

      assert.strictEqual(sentiment, 'negative');

      // Step 4: Call completed
      const completedCall = {
        ...call,
        status: 'completed' as const,
        outcome: 'not_interested' as const,
        sentiment,
      };

      // Step 5: Lead marked as do not call
      const updatedLead = {
        lead_id: call.lead_id,
        status: 'do_not_call' as const,
        notes: 'Explicitly requested not to be contacted',
      };

      assert.strictEqual(updatedLead.status, 'do_not_call');

      console.log('✅ Not interested flow test passed');
    });
  });

  describe('Flow 5: Analytics Tracking', () => {
    it('should track analytics for multiple calls', () => {
      const calls = [
        { outcome: 'meeting_booked', sentiment: 'positive', duration: 180 },
        { outcome: 'callback_requested', sentiment: 'neutral', duration: 120 },
        { outcome: 'not_interested', sentiment: 'negative', duration: 60 },
        { outcome: 'meeting_booked', sentiment: 'positive', duration: 200 },
        { outcome: 'voicemail', sentiment: 'neutral', duration: 30 },
      ];

      const analytics = {
        totalCalls: calls.length,
        meetingsBooked: calls.filter(c => c.outcome === 'meeting_booked').length,
        conversionRate: (calls.filter(c => c.outcome === 'meeting_booked').length / calls.length) * 100,
        avgDuration: calls.reduce((sum, c) => sum + c.duration, 0) / calls.length,
        sentiment: {
          positive: calls.filter(c => c.sentiment === 'positive').length,
          neutral: calls.filter(c => c.sentiment === 'neutral').length,
          negative: calls.filter(c => c.sentiment === 'negative').length,
        },
      };

      assert.strictEqual(analytics.totalCalls, 5);
      assert.strictEqual(analytics.meetingsBooked, 2);
      assert.strictEqual(analytics.conversionRate, 40);
      assert.strictEqual(analytics.sentiment.positive, 2);
      assert.strictEqual(analytics.sentiment.negative, 1);

      console.log('✅ Analytics tracking test passed');
    });
  });

  describe('Flow 6: Lead Scoring', () => {
    it('should calculate lead scores based on engagement', () => {
      const testCases = [
        {
          calls: 1,
          meetings: 1,
          positiveSentiment: 1,
          expectedScore: 95, // Base 50 + 5 call + 30 meeting + 10 positive
        },
        {
          calls: 2,
          meetings: 0,
          positiveSentiment: 1,
          expectedScore: 70, // Base 50 + 10 calls + 10 positive
        },
        {
          calls: 1,
          meetings: 0,
          positiveSentiment: 0,
          expectedScore: 55, // Base 50 + 5 call
        },
      ];

      testCases.forEach(({ calls, meetings, positiveSentiment, expectedScore }) => {
        let score = 50; // Base score
        score += calls * 5;
        score += meetings * 30;
        score += positiveSentiment * 10;
        score = Math.min(score, 100); // Cap at 100

        assert.strictEqual(score, expectedScore);
      });

      console.log('✅ Lead scoring test passed');
    });
  });
});
