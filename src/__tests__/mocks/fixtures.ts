/**
 * Test fixtures for CallKaro AI
 */

import type { Lead, Call, Transcript, Campaign } from '../../integrations/supabase.js';

export const mockLead: Lead = {
  id: 'lead-test-123',
  name: 'Rahul Sharma',
  phone: '+919876543210',
  email: 'rahul@example.com',
  company: 'Test Startup Pvt Ltd',
  designation: 'CTO',
  industry: 'Technology',
  linkedin_url: 'https://linkedin.com/in/rahulsharma',
  company_size: '10-50',
  location: 'Bangalore',
  status: 'pending',
  priority: 5,
  lead_score: 50,
  campaign_id: 'campaign-test-456',
  source: 'csv_upload',
  notes: 'Test lead for unit tests',
  created_at: '2025-01-01T10:00:00Z',
  updated_at: '2025-01-01T10:00:00Z',
};

export const mockCall: Call = {
  id: 'call-test-789',
  lead_id: 'lead-test-123',
  twilio_call_sid: 'CAtest123456',
  livekit_room_name: 'callkaro-test-room',
  status: 'completed',
  direction: 'outbound',
  duration_seconds: 180,
  started_at: '2025-01-01T10:00:00Z',
  answered_at: '2025-01-01T10:00:05Z',
  ended_at: '2025-01-01T10:03:00Z',
  outcome: 'meeting_booked',
  disposition: 'answered',
  objections_raised: ['busy', 'price'],
  key_points: ['interested in product', 'asked about pricing'],
  sentiment: 'positive',
  meeting_booked: true,
  meeting_datetime: '2025-01-05T15:00:00Z',
  meeting_link: 'https://zoom.us/j/123456789',
  calendar_event_id: 'calendar-event-123',
  transferred_to_human: false,
  recording_url: 'https://api.twilio.com/recordings/REtest123.mp3',
  recording_duration: 180,
  talk_time_seconds: 150,
  agent_talk_percentage: 60.5,
  interruption_count: 2,
  created_at: '2025-01-01T10:00:00Z',
  updated_at: '2025-01-01T10:03:00Z',
};

export const mockTranscript: Transcript = {
  id: 'transcript-test-001',
  call_id: 'call-test-789',
  speaker: 'agent',
  message: 'Hi, am I speaking with Rahul? Great! This is Raj from Test Company.',
  timestamp_ms: 1000,
  confidence: 0.95,
  language: 'en-IN',
  created_at: '2025-01-01T10:00:01Z',
};

export const mockCampaign: Campaign = {
  id: 'campaign-test-456',
  name: 'Test Campaign 2025',
  description: 'Test campaign for unit tests',
  target_audience: 'Tech startups',
  product_pitch: 'Revolutionary AI product',
  status: 'active',
  total_leads: 100,
  calls_made: 50,
  meetings_booked: 15,
  conversion_rate: 30.0,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T12:00:00Z',
  started_at: '2025-01-01T00:00:00Z',
};

export const mockCSVData = [
  {
    name: 'Test User 1',
    phone: '+919999999991',
    email: 'user1@test.com',
    company: 'Test Co 1',
    designation: 'CEO',
    industry: 'SaaS',
  },
  {
    name: 'Test User 2',
    phone: '+919999999992',
    email: 'user2@test.com',
    company: 'Test Co 2',
    designation: 'CTO',
    industry: 'Fintech',
  },
];

export const mockTwilioCallStatus = {
  CallSid: 'CAtest123456',
  CallStatus: 'completed',
  Duration: '180',
  StartTime: '2025-01-01T10:00:00Z',
  EndTime: '2025-01-01T10:03:00Z',
  From: '+15555551234',
  To: '+919876543210',
  AnsweredBy: 'human',
};

export const mockGoogleCalendarEvent = {
  id: 'calendar-event-123',
  htmlLink: 'https://calendar.google.com/event?eid=test123',
  hangoutLink: 'https://meet.google.com/abc-defg-hij',
  start: {
    dateTime: '2025-01-05T15:00:00+05:30',
    timeZone: 'Asia/Kolkata',
  },
  end: {
    dateTime: '2025-01-05T15:15:00+05:30',
    timeZone: 'Asia/Kolkata',
  },
};

export const mockZoomMeeting = {
  id: '123456789',
  join_url: 'https://zoom.us/j/123456789?pwd=test123',
  start_url: 'https://zoom.us/s/123456789?zak=test123',
  password: 'test123',
  start_time: '2025-01-05T15:00:00Z',
  duration: 15,
  topic: 'Test Product Demo - Rahul Sharma (Test Startup Pvt Ltd)',
};

export const mockDeepgramResponse = {
  results: {
    channels: [
      {
        alternatives: [
          {
            transcript: 'Hi, this is a test transcription.',
            confidence: 0.95,
          },
        ],
      },
    ],
  },
};

export const mockGeminiResponse = {
  text: 'Sure! But you know how emails work, right? They get lost in the inbox.',
  functionCall: null,
};

export const mockSupabaseResponse = {
  data: mockLead,
  error: null,
};
