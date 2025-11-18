/**
 * Google Gemini 1.5 Flash LLM Integration for CallKaro AI
 * Handles conversation logic with function calling for meeting booking
 */

import { GoogleGenerativeAI, GenerativeModel, Content } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

export interface GeminiConfig {
  model: string;
  temperature: number;
  maxOutputTokens: number;
  topP: number;
  topK: number;
}

/**
 * Function calling tools for Gemini
 */
export const CALLKARO_TOOLS = [
  {
    name: 'book_meeting',
    description: `Book a demo meeting with the prospect. Use this when the prospect agrees to a meeting.

    Important: Only call this function when the prospect explicitly agrees to schedule a meeting.
    Get confirmation on date/time before calling.`,
    parameters: {
      type: 'object',
      properties: {
        prospect_name: {
          type: 'string',
          description: 'Name of the prospect',
        },
        prospect_email: {
          type: 'string',
          description: 'Email address of the prospect',
        },
        preferred_date: {
          type: 'string',
          description: 'Preferred date in YYYY-MM-DD format',
        },
        preferred_time: {
          type: 'string',
          description: 'Preferred time in HH:MM format (24-hour)',
        },
        notes: {
          type: 'string',
          description: 'Any additional notes about the meeting',
        },
      },
      required: ['prospect_name', 'prospect_email', 'preferred_date', 'preferred_time'],
    },
  },
  {
    name: 'transfer_to_human',
    description: `Transfer the call to a human sales representative. Use this when:
    - The prospect asks to speak with a manager or senior person
    - The conversation requires technical details beyond your knowledge
    - The prospect is very interested and wants immediate assistance

    DO NOT use this for simple objections or questions.`,
    parameters: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Reason for transfer (e.g., "technical_questions", "manager_requested", "high_intent")',
        },
        urgency: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'Urgency level of the transfer',
        },
        context: {
          type: 'string',
          description: 'Brief context about the conversation so far',
        },
      },
      required: ['reason', 'urgency', 'context'],
    },
  },
  {
    name: 'schedule_callback',
    description: `Schedule a callback for later. Use when prospect is busy but interested.`,
    parameters: {
      type: 'object',
      properties: {
        callback_date: {
          type: 'string',
          description: 'Callback date in YYYY-MM-DD format',
        },
        callback_time: {
          type: 'string',
          description: 'Callback time in HH:MM format (24-hour)',
        },
        notes: {
          type: 'string',
          description: 'Notes about what to discuss in callback',
        },
      },
      required: ['callback_date', 'callback_time'],
    },
  },
  {
    name: 'mark_not_interested',
    description: `Mark the lead as not interested. Use when prospect clearly states they are not interested.`,
    parameters: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Reason for not being interested',
        },
        do_not_call: {
          type: 'boolean',
          description: 'Whether prospect requested to not be called again',
        },
      },
      required: ['reason'],
    },
  },
];

/**
 * System prompt for CallKaro AI
 * Creates the Indian SDR persona with Hinglish style
 */
export function getCallKaroSystemPrompt(config: {
  agentName: string;
  companyName: string;
  productName: string;
  demoDuration: number;
}): string {
  const { agentName, companyName, productName, demoDuration } = config;

  return `You are ${agentName}, a top-performing Sales Development Representative (SDR) from ${companyName}, based in Delhi/Mumbai. You're calling to introduce ${productName}.

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

**CLOSING:**
When they agree to a demo, use the book_meeting function with their details.

If they ask for transfer to manager/technical person, use transfer_to_human function.

If they want callback later, use schedule_callback function.

If clearly not interested after multiple attempts, use mark_not_interested function and end politely.

**REMEMBER:**
Your job is to get the MEETING booked, not to close the deal on this call. Be helpful, be human, be Hinglish! 🔥

Now go make that call count! Sab kuch clear hai? Let's go! 🚀`;
}

/**
 * Gemini LLM Service
 */
export class GeminiLLM {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private config: GeminiConfig;
  private conversationHistory: Content[] = [];

  constructor(systemPrompt: string, config?: Partial<GeminiConfig>) {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_GEMINI_API_KEY is required');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);

    this.config = {
      model: 'gemini-1.5-flash',
      temperature: 0.8, // Higher for more natural, creative responses
      maxOutputTokens: 200, // Keep responses short for voice
      topP: 0.95,
      topK: 40,
      ...config,
    };

    this.model = this.genAI.getGenerativeModel({
      model: this.config.model,
      generationConfig: {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxOutputTokens,
        topP: this.config.topP,
        topK: this.config.topK,
      },
      systemInstruction: systemPrompt,
    });
  }

  /**
   * Send a message and get response
   */
  async sendMessage(userMessage: string): Promise<{
    text: string;
    functionCall?: any;
  }> {
    try {
      // Add user message to history
      this.conversationHistory.push({
        role: 'user',
        parts: [{ text: userMessage }],
      });

      // Start chat with history
      const chat = this.model.startChat({
        history: this.conversationHistory.slice(0, -1), // Exclude last message
      });

      // Send message
      const result = await chat.sendMessage(userMessage);
      const response = result.response;

      const text = response.text();

      // Add assistant response to history
      this.conversationHistory.push({
        role: 'model',
        parts: [{ text }],
      });

      // Check for function calls (if we enabled tools)
      const functionCall = response.functionCalls?.()?.[0];

      return {
        text,
        functionCall,
      };
    } catch (error) {
      console.error('Gemini API error:', error);
      throw error;
    }
  }

  /**
   * Get conversation history
   */
  getHistory(): Content[] {
    return [...this.conversationHistory];
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Add system message to history
   */
  addSystemMessage(message: string): void {
    this.conversationHistory.push({
      role: 'model',
      parts: [{ text: message }],
    });
  }
}

/**
 * Factory function to create Gemini LLM with CallKaro prompt
 */
export function createCallKaroLLM(config?: {
  agentName?: string;
  companyName?: string;
  productName?: string;
  demoDuration?: number;
}): GeminiLLM {
  const systemPrompt = getCallKaroSystemPrompt({
    agentName: config?.agentName || process.env.CALLKARO_AGENT_NAME || 'Raj',
    companyName: config?.companyName || process.env.CALLKARO_COMPANY_NAME || 'Your Company',
    productName: config?.productName || process.env.CALLKARO_PRODUCT_NAME || 'our product',
    demoDuration: config?.demoDuration || parseInt(process.env.CALLKARO_DEMO_DURATION_MINUTES || '15'),
  });

  return new GeminiLLM(systemPrompt);
}
