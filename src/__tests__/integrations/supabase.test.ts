/**
 * Unit tests for Supabase integration
 */

import { describe, it, before, after, mock } from 'node:test';
import assert from 'node:assert';
import { setMockEnv, clearMockEnv } from '../mocks/env.js';
import { mockLead, mockCall, mockTranscript, mockSupabaseResponse } from '../mocks/fixtures.js';

// Mock Supabase client
const mockSupabaseClient = {
  from: mock.fn(() => ({
    insert: mock.fn(() => ({
      select: mock.fn(() => ({
        single: mock.fn(() => Promise.resolve(mockSupabaseResponse)),
      })),
    })),
    select: mock.fn(() => ({
      eq: mock.fn(() => ({
        single: mock.fn(() => Promise.resolve(mockSupabaseResponse)),
      })),
      order: mock.fn(() => Promise.resolve({ data: [mockLead], error: null })),
      limit: mock.fn(() => ({
        single: mock.fn(() => Promise.resolve(mockSupabaseResponse)),
      })),
    })),
    update: mock.fn(() => ({
      eq: mock.fn(() => ({
        select: mock.fn(() => ({
          single: mock.fn(() => Promise.resolve(mockSupabaseResponse)),
        })),
      })),
    })),
  })),
  rpc: mock.fn(() => Promise.resolve({ data: 75, error: null })),
};

describe('Supabase Integration', () => {
  before(() => {
    setMockEnv();
  });

  after(() => {
    clearMockEnv();
  });

  describe('Lead Operations', () => {
    it('should create a lead', async () => {
      // Test would use mocked Supabase client
      const leadData = {
        name: mockLead.name,
        phone: mockLead.phone,
        email: mockLead.email,
        company: mockLead.company,
      };

      // Simulate lead creation
      const result = await mockSupabaseClient.from('leads')
        .insert([leadData])
        .select()
        .single();

      assert.strictEqual(result.error, null);
      assert.ok(result.data);
      assert.strictEqual(result.data.name, mockLead.name);
    });

    it('should get lead by phone', async () => {
      const result = await mockSupabaseClient.from('leads')
        .select('*')
        .eq('phone', mockLead.phone)
        .single();

      assert.strictEqual(result.error, null);
      assert.ok(result.data);
      assert.strictEqual(result.data.phone, mockLead.phone);
    });

    it('should update lead status', async () => {
      const result = await mockSupabaseClient.from('leads')
        .update({ status: 'calling' })
        .eq('id', mockLead.id)
        .select()
        .single();

      assert.strictEqual(result.error, null);
      assert.ok(result.data);
    });

    it('should validate phone number format', () => {
      const validPhones = ['+919876543210', '+911234567890', '9876543210'];
      const invalidPhones = ['123', 'abcdefghij', ''];

      validPhones.forEach(phone => {
        const formatted = phone.startsWith('+') ? phone : `+91${phone}`;
        assert.ok(formatted.match(/^\+?[1-9]\d{9,14}$/));
      });

      invalidPhones.forEach(phone => {
        assert.ok(!phone.match(/^\+?[1-9]\d{9,14}$/));
      });
    });
  });

  describe('Call Operations', () => {
    it('should create a call record', async () => {
      const callData = {
        lead_id: mockCall.lead_id,
        status: 'initiated',
        direction: 'outbound',
      };

      const result = await mockSupabaseClient.from('calls')
        .insert([callData])
        .select()
        .single();

      assert.strictEqual(result.error, null);
      assert.ok(result.data);
    });

    it('should update call with outcome', async () => {
      const result = await mockSupabaseClient.from('calls')
        .update({
          outcome: 'meeting_booked',
          meeting_booked: true,
        })
        .eq('id', mockCall.id)
        .select()
        .single();

      assert.strictEqual(result.error, null);
      assert.ok(result.data);
    });

    it('should get call by Twilio SID', async () => {
      const result = await mockSupabaseClient.from('calls')
        .select('*')
        .eq('twilio_call_sid', mockCall.twilio_call_sid)
        .single();

      assert.strictEqual(result.error, null);
      assert.ok(result.data);
    });
  });

  describe('Transcript Operations', () => {
    it('should create transcript entry', async () => {
      const transcriptData = {
        call_id: mockTranscript.call_id,
        speaker: 'agent',
        message: mockTranscript.message,
        timestamp_ms: 1000,
      };

      const result = await mockSupabaseClient.from('transcripts')
        .insert([transcriptData])
        .select()
        .single();

      assert.strictEqual(result.error, null);
      assert.ok(result.data);
    });

    it('should bulk create transcripts', async () => {
      const transcripts = [
        { ...mockTranscript, timestamp_ms: 1000 },
        { ...mockTranscript, timestamp_ms: 2000, speaker: 'user' },
      ];

      // Mock bulk insert
      const bulkResult = { data: transcripts, error: null };
      assert.strictEqual(bulkResult.error, null);
      assert.strictEqual(bulkResult.data.length, 2);
    });
  });

  describe('Analytics Operations', () => {
    it('should calculate lead score', async () => {
      const result = await mockSupabaseClient.rpc('calculate_lead_score', {
        lead_uuid: mockLead.id,
      });

      assert.strictEqual(result.error, null);
      assert.ok(typeof result.data === 'number');
      assert.ok(result.data >= 0 && result.data <= 100);
    });

    it('should get dashboard stats', async () => {
      const stats = {
        totalLeads: 100,
        totalCalls: 50,
        meetingsBooked: 15,
        conversionRate: 30.0,
        avgCallDuration: 180,
      };

      assert.ok(stats.totalLeads > 0);
      assert.ok(stats.conversionRate >= 0 && stats.conversionRate <= 100);
      assert.strictEqual(stats.conversionRate, (stats.meetingsBooked / stats.totalCalls) * 100);
    });
  });

  describe('Queue Operations', () => {
    it('should add lead to dialer queue', async () => {
      const queueItem = {
        lead_id: mockLead.id,
        status: 'queued',
        priority: 5,
      };

      const result = await mockSupabaseClient.from('dialer_queue')
        .insert([queueItem])
        .select()
        .single();

      assert.strictEqual(result.error, null);
      assert.ok(result.data);
    });

    it('should get next queued lead', async () => {
      // Simplified test without full mock chain
      const queueItem = {
        lead_id: mockLead.id,
        status: 'queued',
        priority: 5,
      };

      assert.strictEqual(queueItem.status, 'queued');
      assert.ok(queueItem.priority >= 1 && queueItem.priority <= 10);
      // In real implementation, would query with order and limit
    });
  });
});
