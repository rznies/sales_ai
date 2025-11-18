/**
 * Supabase Integration for CallKaro AI
 * Handles all database operations for leads, calls, and transcripts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Type Definitions
export interface Lead {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  designation?: string;
  industry?: string;
  linkedin_url?: string;
  company_size?: string;
  location?: string;
  status?: 'pending' | 'calling' | 'called' | 'interested' | 'not_interested' | 'meeting_booked' | 'do_not_call';
  priority?: number;
  lead_score?: number;
  campaign_id?: string;
  source?: string;
  notes?: string;
  custom_fields?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
  last_called_at?: string;
}

export interface Call {
  id?: string;
  lead_id: string;
  twilio_call_sid?: string;
  livekit_room_name?: string;
  status?: 'initiated' | 'ringing' | 'in-progress' | 'completed' | 'failed' | 'no-answer' | 'busy' | 'canceled';
  direction?: 'outbound' | 'inbound';
  duration_seconds?: number;
  started_at?: string;
  answered_at?: string;
  ended_at?: string;
  outcome?: 'interested' | 'not_interested' | 'meeting_booked' | 'callback_requested' | 'voicemail' | 'wrong_number' | 'do_not_call';
  disposition?: string;
  objections_raised?: string[];
  key_points?: string[];
  sentiment?: 'positive' | 'neutral' | 'negative';
  meeting_booked?: boolean;
  meeting_datetime?: string;
  meeting_link?: string;
  calendar_event_id?: string;
  transferred_to_human?: boolean;
  transfer_reason?: string;
  transfer_timestamp?: string;
  recording_url?: string;
  recording_duration?: number;
  talk_time_seconds?: number;
  agent_talk_percentage?: number;
  interruption_count?: number;
  error_message?: string;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface Transcript {
  id?: string;
  call_id: string;
  speaker: 'agent' | 'user';
  message: string;
  timestamp_ms: number;
  confidence?: number;
  language?: string;
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface Campaign {
  id?: string;
  name: string;
  description?: string;
  target_audience?: string;
  product_pitch?: string;
  status?: 'draft' | 'active' | 'paused' | 'completed';
  total_leads?: number;
  calls_made?: number;
  meetings_booked?: number;
  conversion_rate?: number;
  created_at?: string;
  updated_at?: string;
  started_at?: string;
  completed_at?: string;
}

export interface DialerQueueItem {
  id?: string;
  lead_id: string;
  status?: 'queued' | 'calling' | 'completed' | 'failed' | 'skipped';
  priority?: number;
  retry_count?: number;
  max_retries?: number;
  next_retry_at?: string;
  scheduled_for?: string;
  created_at?: string;
  updated_at?: string;
  processed_at?: string;
}

/**
 * Supabase Client Singleton
 */
class SupabaseService {
  private static instance: SupabaseService;
  private client: SupabaseClient;

  private constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env.local');
    }

    this.client = createClient(supabaseUrl, supabaseKey);
  }

  public static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }

  public getClient(): SupabaseClient {
    return this.client;
  }

  // =============================================
  // LEAD OPERATIONS
  // =============================================

  async createLead(lead: Lead): Promise<Lead> {
    const { data, error } = await this.client
      .from('leads')
      .insert([lead])
      .select()
      .single();

    if (error) throw new Error(`Failed to create lead: ${error.message}`);
    return data;
  }

  async getLeadByPhone(phone: string): Promise<Lead | null> {
    const { data, error } = await this.client
      .from('leads')
      .select('*')
      .eq('phone', phone)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch lead: ${error.message}`);
    }
    return data;
  }

  async getLeadById(id: string): Promise<Lead | null> {
    const { data, error } = await this.client
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(`Failed to fetch lead: ${error.message}`);
    return data;
  }

  async updateLead(id: string, updates: Partial<Lead>): Promise<Lead> {
    const { data, error } = await this.client
      .from('leads')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update lead: ${error.message}`);
    return data;
  }

  async updateLeadStatus(id: string, status: Lead['status']): Promise<void> {
    const { error } = await this.client
      .from('leads')
      .update({ status, last_called_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(`Failed to update lead status: ${error.message}`);
  }

  async bulkCreateLeads(leads: Lead[]): Promise<Lead[]> {
    const { data, error } = await this.client
      .from('leads')
      .insert(leads)
      .select();

    if (error) throw new Error(`Failed to bulk create leads: ${error.message}`);
    return data;
  }

  // =============================================
  // CALL OPERATIONS
  // =============================================

  async createCall(call: Call): Promise<Call> {
    const { data, error } = await this.client
      .from('calls')
      .insert([call])
      .select()
      .single();

    if (error) throw new Error(`Failed to create call: ${error.message}`);
    return data;
  }

  async updateCall(id: string, updates: Partial<Call>): Promise<Call> {
    const { data, error } = await this.client
      .from('calls')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update call: ${error.message}`);
    return data;
  }

  async getCallByTwilioSid(twilioSid: string): Promise<Call | null> {
    const { data, error } = await this.client
      .from('calls')
      .select('*')
      .eq('twilio_call_sid', twilioSid)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch call: ${error.message}`);
    }
    return data;
  }

  async getCallsByLeadId(leadId: string): Promise<Call[]> {
    const { data, error } = await this.client
      .from('calls')
      .select('*')
      .eq('lead_id', leadId)
      .order('started_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch calls: ${error.message}`);
    return data || [];
  }

  // =============================================
  // TRANSCRIPT OPERATIONS
  // =============================================

  async createTranscript(transcript: Transcript): Promise<Transcript> {
    const { data, error } = await this.client
      .from('transcripts')
      .insert([transcript])
      .select()
      .single();

    if (error) throw new Error(`Failed to create transcript: ${error.message}`);
    return data;
  }

  async bulkCreateTranscripts(transcripts: Transcript[]): Promise<Transcript[]> {
    const { data, error } = await this.client
      .from('transcripts')
      .insert(transcripts)
      .select();

    if (error) throw new Error(`Failed to bulk create transcripts: ${error.message}`);
    return data;
  }

  async getTranscriptsByCallId(callId: string): Promise<Transcript[]> {
    const { data, error } = await this.client
      .from('transcripts')
      .select('*')
      .eq('call_id', callId)
      .order('timestamp_ms', { ascending: true });

    if (error) throw new Error(`Failed to fetch transcripts: ${error.message}`);
    return data || [];
  }

  // =============================================
  // CAMPAIGN OPERATIONS
  // =============================================

  async createCampaign(campaign: Campaign): Promise<Campaign> {
    const { data, error } = await this.client
      .from('campaigns')
      .insert([campaign])
      .select()
      .single();

    if (error) throw new Error(`Failed to create campaign: ${error.message}`);
    return data;
  }

  async getCampaignById(id: string): Promise<Campaign | null> {
    const { data, error } = await this.client
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(`Failed to fetch campaign: ${error.message}`);
    return data;
  }

  async getAllCampaigns(): Promise<Campaign[]> {
    const { data, error } = await this.client
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch campaigns: ${error.message}`);
    return data || [];
  }

  async updateCampaignStats(campaignId: string): Promise<void> {
    const { error } = await this.client.rpc('update_campaign_stats', {
      campaign_uuid: campaignId,
    });

    if (error) throw new Error(`Failed to update campaign stats: ${error.message}`);
  }

  // =============================================
  // DIALER QUEUE OPERATIONS
  // =============================================

  async addToQueue(queueItem: DialerQueueItem): Promise<DialerQueueItem> {
    const { data, error } = await this.client
      .from('dialer_queue')
      .insert([queueItem])
      .select()
      .single();

    if (error) throw new Error(`Failed to add to queue: ${error.message}`);
    return data;
  }

  async getNextQueuedLead(): Promise<(DialerQueueItem & { lead: Lead }) | null> {
    const { data, error } = await this.client
      .from('dialer_queue')
      .select('*, lead:leads(*)')
      .eq('status', 'queued')
      .lte('scheduled_for', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('scheduled_for', { ascending: true })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch queued lead: ${error.message}`);
    }
    return data;
  }

  async updateQueueStatus(id: string, status: DialerQueueItem['status']): Promise<void> {
    const updates: Partial<DialerQueueItem> = { status };
    if (status === 'completed' || status === 'failed') {
      updates.processed_at = new Date().toISOString();
    }

    const { error } = await this.client
      .from('dialer_queue')
      .update(updates)
      .eq('id', id);

    if (error) throw new Error(`Failed to update queue status: ${error.message}`);
  }

  // =============================================
  // ANALYTICS OPERATIONS
  // =============================================

  async getDashboardStats(): Promise<{
    totalLeads: number;
    totalCalls: number;
    meetingsBooked: number;
    conversionRate: number;
    avgCallDuration: number;
  }> {
    const [leadsCount, callsStats] = await Promise.all([
      this.client.from('leads').select('*', { count: 'exact', head: true }),
      this.client
        .from('calls')
        .select('meeting_booked, duration_seconds')
        .not('started_at', 'is', null),
    ]);

    const totalLeads = leadsCount.count || 0;
    const totalCalls = callsStats.data?.length || 0;
    const meetingsBooked = callsStats.data?.filter((c) => c.meeting_booked).length || 0;
    const conversionRate = totalCalls > 0 ? (meetingsBooked / totalCalls) * 100 : 0;
    const avgCallDuration =
      totalCalls > 0
        ? callsStats.data!.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) / totalCalls
        : 0;

    return {
      totalLeads,
      totalCalls,
      meetingsBooked,
      conversionRate: Math.round(conversionRate * 100) / 100,
      avgCallDuration: Math.round(avgCallDuration),
    };
  }

  async getRecentCalls(limit: number = 10): Promise<(Call & { lead: Lead })[]> {
    const { data, error } = await this.client
      .from('calls')
      .select('*, lead:leads(*)')
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to fetch recent calls: ${error.message}`);
    return data || [];
  }

  async calculateLeadScore(leadId: string): Promise<number> {
    const { data, error } = await this.client.rpc('calculate_lead_score', {
      lead_uuid: leadId,
    });

    if (error) throw new Error(`Failed to calculate lead score: ${error.message}`);
    return data;
  }
}

// Export singleton instance
export const supabase = SupabaseService.getInstance();
export const supabaseClient = supabase.getClient();
