-- CallKaro AI Database Schema
-- Complete schema for leads, calls, transcripts, and analytics

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- LEADS TABLE
-- Stores all lead information from CSV uploads
-- =============================================
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Lead Information
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(255),
  company VARCHAR(255),
  designation VARCHAR(255),
  industry VARCHAR(255),

  -- Enrichment Data
  linkedin_url VARCHAR(500),
  company_size VARCHAR(50),
  location VARCHAR(255),

  -- Status Tracking
  status VARCHAR(50) DEFAULT 'pending', -- pending, calling, called, interested, not_interested, meeting_booked, do_not_call
  priority INTEGER DEFAULT 5, -- 1-10, higher = more priority
  lead_score INTEGER DEFAULT 0, -- 0-100, calculated based on engagement

  -- Campaign Tracking
  campaign_id VARCHAR(100),
  source VARCHAR(100), -- csv_upload, manual, api

  -- Metadata
  notes TEXT,
  custom_fields JSONB,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_called_at TIMESTAMP WITH TIME ZONE,

  -- Indexes for fast queries
  CONSTRAINT valid_phone CHECK (phone ~ '^\+?[0-9]{10,15}$')
);

CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_priority ON leads(priority DESC);
CREATE INDEX idx_leads_phone ON leads(phone);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);

-- =============================================
-- CALLS TABLE
-- Stores all call logs and metadata
-- =============================================
CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,

  -- Call Details
  twilio_call_sid VARCHAR(100) UNIQUE,
  livekit_room_name VARCHAR(255),

  -- Call Status
  status VARCHAR(50) DEFAULT 'initiated', -- initiated, ringing, in-progress, completed, failed, no-answer, busy, canceled
  direction VARCHAR(20) DEFAULT 'outbound', -- outbound, inbound

  -- Duration & Timing
  duration_seconds INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  answered_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,

  -- Call Outcome
  outcome VARCHAR(50), -- interested, not_interested, meeting_booked, callback_requested, voicemail, wrong_number, do_not_call
  disposition VARCHAR(100), -- answered, no_answer, busy, failed, canceled

  -- Objections & Insights
  objections_raised TEXT[],
  key_points TEXT[],
  sentiment VARCHAR(20), -- positive, neutral, negative

  -- Meeting Details (if booked)
  meeting_booked BOOLEAN DEFAULT FALSE,
  meeting_datetime TIMESTAMP WITH TIME ZONE,
  meeting_link VARCHAR(500),
  calendar_event_id VARCHAR(255),

  -- Transfer Details
  transferred_to_human BOOLEAN DEFAULT FALSE,
  transfer_reason TEXT,
  transfer_timestamp TIMESTAMP WITH TIME ZONE,

  -- Recording & Transcript
  recording_url VARCHAR(500),
  recording_duration INTEGER,

  -- Analytics
  talk_time_seconds INTEGER DEFAULT 0,
  agent_talk_percentage DECIMAL(5,2),
  interruption_count INTEGER DEFAULT 0,

  -- Metadata
  error_message TEXT,
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_calls_lead_id ON calls(lead_id);
CREATE INDEX idx_calls_status ON calls(status);
CREATE INDEX idx_calls_outcome ON calls(outcome);
CREATE INDEX idx_calls_started_at ON calls(started_at DESC);
CREATE INDEX idx_calls_twilio_sid ON calls(twilio_call_sid);

-- =============================================
-- TRANSCRIPTS TABLE
-- Stores full conversation transcripts
-- =============================================
CREATE TABLE IF NOT EXISTS transcripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_id UUID REFERENCES calls(id) ON DELETE CASCADE,

  -- Transcript Content
  speaker VARCHAR(20) NOT NULL, -- agent, user
  message TEXT NOT NULL,
  timestamp_ms BIGINT NOT NULL, -- milliseconds from call start

  -- Speech Metadata
  confidence DECIMAL(5,4), -- 0-1, STT confidence
  language VARCHAR(10) DEFAULT 'en-IN',

  -- Metadata
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_transcripts_call_id ON transcripts(call_id);
CREATE INDEX idx_transcripts_timestamp ON transcripts(timestamp_ms);

-- =============================================
-- CAMPAIGNS TABLE
-- Organize leads into campaigns
-- =============================================
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Campaign Info
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Targeting
  target_audience TEXT,
  product_pitch TEXT,

  -- Status
  status VARCHAR(50) DEFAULT 'draft', -- draft, active, paused, completed

  -- Stats (denormalized for performance)
  total_leads INTEGER DEFAULT 0,
  calls_made INTEGER DEFAULT 0,
  meetings_booked INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_campaigns_status ON campaigns(status);

-- =============================================
-- CALL_ANALYTICS TABLE
-- Aggregated analytics for reporting
-- =============================================
CREATE TABLE IF NOT EXISTS call_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Time Period
  date DATE NOT NULL,
  hour INTEGER, -- 0-23, for hourly analytics

  -- Metrics
  total_calls INTEGER DEFAULT 0,
  successful_calls INTEGER DEFAULT 0,
  failed_calls INTEGER DEFAULT 0,
  meetings_booked INTEGER DEFAULT 0,

  -- Durations (in seconds)
  avg_call_duration INTEGER DEFAULT 0,
  total_talk_time INTEGER DEFAULT 0,

  -- Conversion Metrics
  conversion_rate DECIMAL(5,2) DEFAULT 0,
  avg_lead_score DECIMAL(5,2) DEFAULT 0,

  -- Revenue Metrics (if available)
  estimated_pipeline_value DECIMAL(12,2) DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(date, hour)
);

CREATE INDEX idx_analytics_date ON call_analytics(date DESC);

-- =============================================
-- DIALER_QUEUE TABLE
-- Manages the auto-dialer queue
-- =============================================
CREATE TABLE IF NOT EXISTS dialer_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,

  -- Queue Status
  status VARCHAR(50) DEFAULT 'queued', -- queued, calling, completed, failed, skipped
  priority INTEGER DEFAULT 5,

  -- Retry Logic
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TIMESTAMP WITH TIME ZONE,

  -- Scheduling
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_queue_status ON dialer_queue(status);
CREATE INDEX idx_queue_scheduled ON dialer_queue(scheduled_for);
CREATE INDEX idx_queue_priority ON dialer_queue(priority DESC);

-- =============================================
-- FUNCTIONS & TRIGGERS
-- =============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calls_updated_at BEFORE UPDATE ON calls
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analytics_updated_at BEFORE UPDATE ON call_analytics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_queue_updated_at BEFORE UPDATE ON dialer_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Calculate lead score based on engagement
CREATE OR REPLACE FUNCTION calculate_lead_score(lead_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 0;
  call_count INTEGER;
  meeting_count INTEGER;
  positive_sentiment_count INTEGER;
BEGIN
  -- Base score
  score := 50;

  -- Get call metrics
  SELECT COUNT(*) INTO call_count
  FROM calls WHERE lead_id = lead_uuid;

  SELECT COUNT(*) INTO meeting_count
  FROM calls WHERE lead_id = lead_uuid AND meeting_booked = TRUE;

  SELECT COUNT(*) INTO positive_sentiment_count
  FROM calls WHERE lead_id = lead_uuid AND sentiment = 'positive';

  -- Score adjustments
  score := score + (call_count * 5); -- +5 per call
  score := score + (meeting_count * 30); -- +30 per meeting
  score := score + (positive_sentiment_count * 10); -- +10 per positive sentiment

  -- Cap at 100
  IF score > 100 THEN
    score := 100;
  END IF;

  RETURN score;
END;
$$ LANGUAGE plpgsql;

-- Update campaign stats
CREATE OR REPLACE FUNCTION update_campaign_stats(campaign_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE campaigns SET
    total_leads = (SELECT COUNT(*) FROM leads WHERE campaign_id::uuid = campaign_uuid),
    calls_made = (SELECT COUNT(*) FROM calls c JOIN leads l ON c.lead_id = l.id WHERE l.campaign_id::uuid = campaign_uuid),
    meetings_booked = (SELECT COUNT(*) FROM calls c JOIN leads l ON c.lead_id = l.id WHERE l.campaign_id::uuid = campaign_uuid AND c.meeting_booked = TRUE),
    conversion_rate = (
      CASE
        WHEN (SELECT COUNT(*) FROM calls c JOIN leads l ON c.lead_id = l.id WHERE l.campaign_id::uuid = campaign_uuid) > 0
        THEN (
          (SELECT COUNT(*) FROM calls c JOIN leads l ON c.lead_id = l.id WHERE l.campaign_id::uuid = campaign_uuid AND c.meeting_booked = TRUE)::DECIMAL
          /
          (SELECT COUNT(*) FROM calls c JOIN leads l ON c.lead_id = l.id WHERE l.campaign_id::uuid = campaign_uuid)::DECIMAL
        ) * 100
        ELSE 0
      END
    )
  WHERE id = campaign_uuid;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- VIEWS FOR ANALYTICS
-- =============================================

-- Active leads view
CREATE OR REPLACE VIEW active_leads AS
SELECT
  l.*,
  COUNT(c.id) as total_calls,
  MAX(c.started_at) as last_call_at,
  BOOL_OR(c.meeting_booked) as has_meeting
FROM leads l
LEFT JOIN calls c ON l.id = c.lead_id
WHERE l.status NOT IN ('meeting_booked', 'do_not_call')
GROUP BY l.id;

-- Call performance view
CREATE OR REPLACE VIEW call_performance AS
SELECT
  DATE(started_at) as call_date,
  COUNT(*) as total_calls,
  COUNT(CASE WHEN meeting_booked THEN 1 END) as meetings_booked,
  AVG(duration_seconds) as avg_duration,
  COUNT(CASE WHEN outcome = 'interested' THEN 1 END) as interested_leads,
  (COUNT(CASE WHEN meeting_booked THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0) * 100) as conversion_rate
FROM calls
WHERE started_at IS NOT NULL
GROUP BY DATE(started_at)
ORDER BY call_date DESC;

-- =============================================
-- SEED DATA (Optional)
-- =============================================

-- Insert sample campaign
INSERT INTO campaigns (id, name, description, status) VALUES
  (uuid_generate_v4(), 'Default Campaign', 'Default campaign for CallKaro AI', 'active')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE leads IS 'Stores all lead information from CSV uploads and other sources';
COMMENT ON TABLE calls IS 'Complete call logs with outcomes, recordings, and analytics';
COMMENT ON TABLE transcripts IS 'Full conversation transcripts for each call';
COMMENT ON TABLE campaigns IS 'Organize leads into targeted campaigns';
COMMENT ON TABLE call_analytics IS 'Aggregated analytics for reporting and dashboards';
COMMENT ON TABLE dialer_queue IS 'Auto-dialer queue management with retry logic';
