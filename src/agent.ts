/**
 * CallKaro AI - The AI Sales Closer
 * Main agent entry point with Indian SDR persona and Hinglish conversation
 */

import {
  type JobContext,
  type JobProcess,
  WorkerOptions,
  cli,
  defineAgent,
  inference,
  llm,
  metrics,
  voice,
} from '@livekit/agents';
import * as livekit from '@livekit/agents-plugin-livekit';
import * as silero from '@livekit/agents-plugin-silero';
import { BackgroundVoiceCancellation } from '@livekit/noise-cancellation-node';
import { z } from 'zod';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { supabase, Call, Transcript } from './integrations/supabase.js';
import { getDefaultVoice } from './integrations/cartesia.js';
import { meetingTools } from './tools/meetingTools.js';

dotenv.config({ path: '.env.local' });

/**
 * CallKaro AI Agent
 * Indian SDR personality with Hinglish style conversation
 */
class CallKaroAgent extends voice.Agent {
  private callId?: string;
  private leadId?: string;
  private conversationStartTime: number = 0;
  private transcriptBuffer: Transcript[] = [];

  constructor(leadId?: string, callId?: string) {
    const agentName = process.env.CALLKARO_AGENT_NAME || 'Raj';
    const companyName = process.env.CALLKARO_COMPANY_NAME || 'Your Company';
    const productName = process.env.CALLKARO_PRODUCT_NAME || 'our product';
    const demoDuration = process.env.CALLKARO_DEMO_DURATION_MINUTES || '15';

    super({
      instructions: `You are ${agentName}, a top-performing Sales Development Representative (SDR) from ${companyName}, based in Delhi/Mumbai. You're calling to introduce ${productName}.

**YOUR PERSONALITY:**
- Confident, energetic, and persistent but always respectful
- Speak in natural Hinglish (mix of Hindi and English) like a real Indian salesperson
- Use Indian expressions: "haan", "toh", "basically", "actually", "you know"
- Be conversational, not robotic. Sound human!
- Keep responses SHORT (1-2 sentences max). This is a phone call, not an essay.

**YOUR GOAL:**
Book a ${demoDuration}-minute demo call to showcase ${productName}. Get the prospect excited!

**OPENING (First 15 seconds are critical!):**
"Hi, am I speaking with [Name]? Great! This is ${agentName} from ${companyName}. How are you doing today?

Listen, main aapko quickly ${demoDuration} minutes dena chahta hoon to show something really interesting for [their company/role]. Is this a good time?"

**HANDLING OBJECTIONS (Indian Style):**

1. **"I'm busy right now"**
   - "Arre, I totally understand! Everyone's busy these days. That's exactly why this will help - it actually SAVES you time. Can I just take 2 minutes to explain? If you're not interested, no problem!"

2. **"Send me details on email"**
   - "Sure! But you know how emails work, right? They get lost in the inbox. Let me just give you a quick overview now - ${demoDuration} minutes. If you like it, then we'll send detailed docs. Otherwise, we'll save your time. Fair enough?"

3. **"We already have a solution"**
   - "Achha! That's great you're using something. Actually, most of our best clients were already using [competitor] before. The thing is, ${productName} does [specific benefit] which saves them [result]. Just curious - are you 100% satisfied with your current setup?"

4. **"What's the price?"**
   - "Great question! Dekho, pricing depends on your specific needs and usage. But I can tell you this - our clients typically see ROI within [timeframe]. The best way is to see a quick demo first, then we can discuss exact pricing for your use case. Makes sense?"

5. **"Not interested"**
   - "No worries! Can I just ask - is it the timing that's not right, or you don't see the need for ${productName} at all? Just want to understand so I don't bother you unnecessarily."

6. **"Call me later" / "Call next month"**
   - "Sure! But real quick before I let you go - just tell me one thing: is [pain point] something you're looking to solve in the next 3-6 months? Because if yes, then a quick demo now will help you plan better. If not, then I won't follow up unnecessarily."

**TALKING POINTS:**
- Focus on PAIN POINTS and RESULTS, not features
- Use social proof: "Companies like [competitor] are already using this"
- Create urgency (but don't be pushy): "We have limited slots this week"
- Ask questions to engage: "How do you currently handle [X]?"
- Use Indian business language: "ROI milega", "time bachega", "cost reduce hoga"

**DO's:**
✅ Keep it conversational and natural
✅ Use the prospect's name occasionally
✅ Listen actively - acknowledge what they say
✅ Be persistent but polite (3 objections max, then back off gracefully)
✅ Mirror their language style
✅ Use "we" and "aap" to build rapport
✅ Get micro-commitments: "Can we try for 10 minutes?"

**DON'Ts:**
❌ Don't be robotic or use fancy English
❌ Don't argue or get defensive
❌ Don't talk too much - let them speak!
❌ Don't give up after first objection
❌ Don't sound desperate
❌ Don't use complex technical jargon unless they do

**REMEMBER:**
Your job is to get the MEETING booked, not to close the deal on this call. Be helpful, be human, be Hinglish! 🔥`,

      // Function calling tools for booking meetings, transfers, etc.
      tools: meetingTools,
    });

    this.leadId = leadId;
    this.callId = callId;
    this.conversationStartTime = Date.now();
  }

  /**
   * Called when agent says something
   */
  async onAgentSpeech(text: string): Promise<void> {
    console.log(`🤖 Agent: ${text}`);

    // Store transcript
    if (this.callId) {
      const transcript: Transcript = {
        call_id: this.callId,
        speaker: 'agent',
        message: text,
        timestamp_ms: Date.now() - this.conversationStartTime,
        language: 'en-IN',
      };

      this.transcriptBuffer.push(transcript);

      // Batch save transcripts every 10 messages
      if (this.transcriptBuffer.length >= 10) {
        await this.flushTranscripts();
      }
    }
  }

  /**
   * Called when user says something
   */
  async onUserSpeech(text: string): Promise<void> {
    console.log(`👤 User: ${text}`);

    // Store transcript
    if (this.callId) {
      const transcript: Transcript = {
        call_id: this.callId,
        speaker: 'user',
        message: text,
        timestamp_ms: Date.now() - this.conversationStartTime,
        language: 'en-IN',
      };

      this.transcriptBuffer.push(transcript);

      // Analyze sentiment and extract objections (placeholder for now)
      await this.analyzeUserResponse(text);
    }
  }

  /**
   * Analyze user response for sentiment and objections
   */
  private async analyzeUserResponse(text: string): Promise<void> {
    // Simple keyword-based analysis (can be enhanced with ML later)
    const positiveKeywords = ['yes', 'interested', 'sure', 'sounds good', 'okay', 'tell me more'];
    const negativeKeywords = ['no', 'not interested', 'busy', 'don\'t call', 'remove'];
    const objectionKeywords = ['expensive', 'price', 'already have', 'email', 'later'];

    const lowerText = text.toLowerCase();

    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    const objections: string[] = [];

    if (positiveKeywords.some((kw) => lowerText.includes(kw))) {
      sentiment = 'positive';
    } else if (negativeKeywords.some((kw) => lowerText.includes(kw))) {
      sentiment = 'negative';
    }

    objectionKeywords.forEach((kw) => {
      if (lowerText.includes(kw)) {
        objections.push(kw);
      }
    });

    // Update call record with sentiment and objections
    if (this.callId && (sentiment !== 'neutral' || objections.length > 0)) {
      try {
        const callRecord = await supabase.updateCall(this.callId, {
          sentiment,
          objections_raised: objections.length > 0 ? objections : undefined,
        } as any);
      } catch (error) {
        console.error('Failed to update sentiment:', error);
      }
    }
  }

  /**
   * Flush transcript buffer to database
   */
  private async flushTranscripts(): Promise<void> {
    if (this.transcriptBuffer.length === 0) return;

    try {
      await supabase.bulkCreateTranscripts(this.transcriptBuffer);
      console.log(`💾 Saved ${this.transcriptBuffer.length} transcript entries`);
      this.transcriptBuffer = [];
    } catch (error) {
      console.error('❌ Failed to save transcripts:', error);
    }
  }

  /**
   * Called when conversation ends
   */
  async onConversationEnd(): Promise<void> {
    console.log('👋 Conversation ended');

    // Flush remaining transcripts
    await this.flushTranscripts();

    // Update call record with final stats
    if (this.callId) {
      const duration = Math.floor((Date.now() - this.conversationStartTime) / 1000);

      try {
        await supabase.updateCall(this.callId, {
          ended_at: new Date().toISOString(),
          duration_seconds: duration,
        } as any);

        // Calculate and update lead score
        if (this.leadId) {
          const leadScore = await supabase.calculateLeadScore(this.leadId);
          await supabase.updateLead(this.leadId, { lead_score: leadScore });
        }
      } catch (error) {
        console.error('❌ Failed to update call end:', error);
      }
    }
  }
}

/**
 * Define the CallKaro AI agent
 */
export default defineAgent({
  prewarm: async (proc: JobProcess) => {
    // Preload VAD model
    proc.userData.vad = await silero.VAD.load();
    console.log('✅ VAD model preloaded');
  },

  entry: async (ctx: JobContext) => {
    console.log('\n🚀 CallKaro AI Agent Starting...\n');

    // Extract lead/call info from room metadata
    const roomMetadata = ctx.room.metadata ? JSON.parse(ctx.room.metadata) : {};
    const leadId = roomMetadata.leadId;
    const callId = roomMetadata.callId;

    console.log(`📞 Lead ID: ${leadId || 'N/A'}`);
    console.log(`🆔 Call ID: ${callId || 'N/A'}`);

    // Get voice configuration
    const voice = getDefaultVoice();
    console.log(`🎤 Voice: ${voice.name} (${voice.accent})`);

    // Set up voice pipeline with Deepgram, Gemini, and Cartesia
    // Note: LiveKit Agents currently uses its inference API
    // For full custom integration, we'd need to use the lower-level APIs
    const session = new voice.AgentSession({
      // Speech-to-text - Using Deepgram Nova-2 for Indian English
      stt: new inference.STT({
        model: 'deepgram/nova-2',
        language: 'en-IN', // Indian English
      }),

      // LLM - Using Gemini 1.5 Flash
      // Note: As of now, LiveKit Agents inference API supports OpenAI, Anthropic, Google
      // We'll use Google Gemini through the inference API
      llm: new inference.LLM({
        model: 'google/gemini-1.5-flash',
        temperature: 0.8, // Higher for more natural responses
      }),

      // TTS - Using Cartesia Sonic 3 with Hinglish voice
      tts: new inference.TTS({
        model: 'cartesia/sonic-3',
        voice: voice.id,
        speed: 1.1, // Slightly faster for energetic sales vibe
      }),

      // Turn detection - multilingual for Hinglish
      turnDetection: new livekit.turnDetector.MultilingualModel(),
      vad: ctx.proc.userData.vad! as silero.VAD,
    });

    // Metrics collection
    const usageCollector = new metrics.UsageCollector();
    session.on(voice.AgentSessionEventTypes.MetricsCollected, (ev) => {
      metrics.logMetrics(ev.metrics);
      usageCollector.collect(ev.metrics);
    });

    const logUsage = async () => {
      const summary = usageCollector.getSummary();
      console.log(`\n💰 Usage Summary: ${JSON.stringify(summary)}\n`);
    };

    ctx.addShutdownCallback(logUsage);

    // Start the session with CallKaro agent
    const agent = new CallKaroAgent(leadId, callId);

    await session.start({
      agent,
      room: ctx.room,
      inputOptions: {
        // Noise cancellation for clear audio
        noiseCancellation: BackgroundVoiceCancellation(),
      },
    });

    // Listen to speech events
    session.on(voice.AgentSessionEventTypes.AgentSpeech, (ev: any) => {
      agent.onAgentSpeech(ev.text || '').catch(console.error);
    });

    session.on(voice.AgentSessionEventTypes.UserSpeech, (ev: any) => {
      agent.onUserSpeech(ev.text || '').catch(console.error);
    });

    // Update call status to in-progress
    if (callId) {
      try {
        await supabase.updateCall(callId, {
          status: 'in-progress',
          answered_at: new Date().toISOString(),
        } as any);
      } catch (error) {
        console.error('Failed to update call status:', error);
      }
    }

    // Join the room and start conversation
    await ctx.connect();

    console.log('✅ Agent connected to room');

    // When session ends
    session.on(voice.AgentSessionEventTypes.SessionEnded, () => {
      agent.onConversationEnd().catch(console.error);
    });
  },
});

// Run the CLI
cli.runApp(new WorkerOptions({ agent: fileURLToPath(import.meta.url) }));
