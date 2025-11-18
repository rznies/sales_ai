# 🔥 CallKaro AI - The AI Sales Closer That Books Meetings Like a Desi Pro 📞

**The most powerful AI Sales Closer for Indian startups & SMBs**

CallKaro AI is an outbound cold-calling bot that sounds 100% desi, handles objections like a pro, books meetings automatically, and closes deals in natural Hinglish.

---

## 🚀 What is CallKaro AI?

CallKaro AI transforms any startup into a sales powerhouse by automating outbound calling with an AI agent that:

✅ **Sounds authentically Indian** - Delhi/Mumbai accent in natural Hinglish
✅ **Handles objections** - "I'm busy", "Send email", "Too expensive" - handles them all
✅ **Books meetings automatically** - Google Calendar + Zoom integration with one command
✅ **Transfers to humans** - Live transfer when prospects want to talk to managers
✅ **Scores leads intelligently** - Tracks engagement and prioritizes hot leads
✅ **Provides full analytics** - Live dashboard with conversion rates, pipeline value
✅ **Records & transcribes everything** - Full conversation logs in Supabase

---

## 🎯 Core Features

### 1. **Outbound Calling System**
- Upload CSV with leads → AI dials numbers one by one
- Twilio Programmable Voice for outbound calls
- LiveKit real-time streaming for ultra-low latency
- Auto-retry logic with smart scheduling

### 2. **AI-Powered Conversations**
- **Deepgram Nova-2 STT** - Optimized for Indian English accents
- **Google Gemini 1.5 Flash LLM** - Lightning-fast responses with function calling
- **Cartesia Sonic 3 TTS** - Native Hinglish voices (Raj/Riya personas)
- Natural Hinglish: "Haan", "Toh", "Dekho", "Achha" - sounds 100% human!

### 3. **Meeting Booking**
- Automatic Google Calendar event creation
- Zoom meeting generation with password
- Email invites sent automatically
- Handles date/time preferences naturally

### 4. **Smart Lead Management**
- CSV upload with validation
- Automatic lead scoring (0-100)
- Campaign tracking
- Pre-call enrichment (LinkedIn scrape - optional)

### 5. **Live Analytics Dashboard** *(Coming Soon)*
- Real-time call monitoring
- Conversion rate tracking
- Pipeline value estimation
- Top objections analysis
- Sentiment tracking

### 6. **Enterprise Features**
- Call recording & transcription
- Live transfer to human agents
- CRM integration via Supabase
- Webhook support for custom integrations

---

## 📦 Tech Stack

| Component | Technology | Why? |
|-----------|-----------|------|
| **Outbound Calling** | Twilio Programmable Voice | Reliable, global reach |
| **Real-time Streaming** | LiveKit | Ultra-low latency voice |
| **STT** | Deepgram Nova-2 | Best for Indian accents |
| **LLM** | Google Gemini 1.5 Flash | Fast, cheap, function calling |
| **TTS** | Cartesia Sonic 3 | Natural Hinglish voices |
| **Database** | Supabase | PostgreSQL + real-time |
| **Calendar** | Google Calendar API | Automatic scheduling |
| **Meetings** | Zoom API | Professional video calls |
| **Agent Framework** | LiveKit Agents (Node.js) | Production-ready voice AI |
| **Deployment** | Fly.io + Vercel | Global CDN, auto-scale |

**All using FREE TIERS!** ✨

---

## 🏗️ Architecture

```
┌─────────────┐
│  CSV Upload │
└──────┬──────┘
       │
       ▼
┌─────────────────┐      ┌──────────────┐
│ Lead Processor  │─────▶│   Supabase   │
└─────────────────┘      │  (Leads DB)  │
                         └──────┬───────┘
                                │
                                ▼
                         ┌──────────────┐
                         │ Dialer Queue │
                         └──────┬───────┘
                                │
                                ▼
                         ┌──────────────┐
                         │    Twilio    │
                         │ Outbound Call│
                         └──────┬───────┘
                                │
                                ▼
                         ┌──────────────────┐
                         │   LiveKit Room   │
                         │  (Voice Stream)  │
                         └──────┬───────────┘
                                │
                    ┌───────────┼───────────┐
                    ▼           ▼           ▼
              ┌─────────┐ ┌─────────┐ ┌─────────┐
              │Deepgram │ │ Gemini  │ │Cartesia │
              │   STT   │ │   LLM   │ │   TTS   │
              └─────────┘ └─────────┘ └─────────┘
                    │           │           │
                    └───────────┼───────────┘
                                │
                                ▼
                        ┌───────────────┐
                        │  CallKaro AI  │
                        │     Agent     │
                        │ (Raj/Riya)    │
                        └───────┬───────┘
                                │
                    ┌───────────┼───────────┐
                    ▼           ▼           ▼
            ┌──────────┐ ┌──────────┐ ┌──────────┐
            │  Google  │ │   Zoom   │ │ Transfer │
            │ Calendar │ │   API    │ │ to Human │
            └──────────┘ └──────────┘ └──────────┘
                    │           │           │
                    └───────────┼───────────┘
                                ▼
                         ┌──────────────┐
                         │   Supabase   │
                         │(Calls + Logs)│
                         └──────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js >= 22
- pnpm >= 10
- Accounts for:
  - LiveKit Cloud
  - Twilio
  - Deepgram
  - Google Cloud (Gemini + Calendar)
  - Supabase
  - Cartesia
  - Zoom (optional)

### 1. Installation

```bash
git clone <your-repo>
cd sales_ai
pnpm install
```

### 2. Environment Setup

Copy `.env.example` to `.env.local` and fill in your API keys:

```bash
cp .env.example .env.local
```

Required variables:
```env
# LiveKit
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_key
LIVEKIT_API_SECRET=your_secret

# AI Models
DEEPGRAM_API_KEY=your_key
GOOGLE_GEMINI_API_KEY=your_key
CARTESIA_API_KEY=your_key

# Twilio
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WEBHOOK_URL=https://your-domain.com/webhooks/twilio

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_key

# Google Calendar
GOOGLE_CALENDAR_CLIENT_ID=your_id
GOOGLE_CALENDAR_CLIENT_SECRET=your_secret
GOOGLE_CALENDAR_REFRESH_TOKEN=your_token

# Zoom (optional)
ZOOM_ACCOUNT_ID=your_id
ZOOM_CLIENT_ID=your_id
ZOOM_CLIENT_SECRET=your_secret

# CallKaro Config
CALLKARO_AGENT_NAME=Raj
CALLKARO_COMPANY_NAME=YourCompany
CALLKARO_PRODUCT_NAME=YourProduct
CALLKARO_DEMO_DURATION_MINUTES=15
```

### 3. Database Setup

Run the Supabase schema:

```bash
# In Supabase SQL Editor, run:
cat supabase/schema.sql
```

Or use the Supabase CLI if installed.

### 4. Download Models

```bash
pnpm run download-files
```

### 5. Run the Agent

**Development:**
```bash
pnpm run dev
```

**Production:**
```bash
pnpm run build
pnpm run start
```

### 6. Run the Webhook Server

In a separate terminal:

```bash
pnpm run webhooks
```

This starts the Twilio webhook server on port 3001.

### 7. Start the Auto-Dialer

```bash
pnpm run dialer
```

---

## 📊 Usage

### Upload Leads from CSV

Create a CSV file with these columns:

```csv
name,phone,email,company,designation,industry,location
Rahul Sharma,+919876543210,rahul@example.com,Tech Startup,CTO,SaaS,Bangalore
Priya Patel,+919123456789,priya@example.com,E-commerce Inc,CEO,E-commerce,Mumbai
```

**Import leads:**

```typescript
import { processLeadsFromCSV } from './src/services/leadProcessor.js';

const result = await processLeadsFromCSV('./leads.csv', 'campaign-id');
console.log(`Imported ${result.successful} leads!`);
```

### Start Auto-Dialing

The dialer automatically calls leads from the queue:

```bash
pnpm run dialer
```

Features:
- Sequential calling (one call at a time)
- Respects working hours (10 AM - 6 PM IST)
- Auto-retry on failures (up to 3 attempts)
- 5-second gap between calls

### Manual Call

```typescript
import { getTwilioService } from './src/integrations/twilio.js';

const twilio = getTwilioService();
await twilio.makeCall({
  to: '+919876543210',
  leadId: 'lead-uuid',
});
```

### View Analytics

```typescript
import { analytics } from './src/services/analytics.js';

const metrics = await analytics.getMetrics('week');
const report = analytics.generateReport(metrics);
console.log(report);
```

---

## 🎤 The CallKaro Persona

CallKaro AI uses authentic Indian sales personalities:

### **Raj (Male - Delhi)**
- Confident, direct, slightly aggressive
- Uses: "Dekho", "Basically", "Achha listen"
- Perfect for B2B tech sales

### **Riya (Female - Delhi)**
- Professional, warm, persuasive
- Uses: "Haan", "Actually", "You know"
- Great for enterprise sales

### **Conversation Style:**

```
Agent: "Hi, am I speaking with Rahul? Great! This is Raj from CallKaro.
        How are you doing today? Listen, main aapko quickly 15 minutes
        dena chahta hoon to show something really interesting for your
        startup. Is this a good time?"

User:  "I'm busy right now."

Agent: "Arre, I totally understand! Everyone's busy these days. That's
        exactly why this will help - it actually SAVES you time. Can I
        just take 2 minutes to explain? If you're not interested, no problem!"

User:  "Okay, go ahead."

Agent: "Perfect! So basically, most startups waste 10-15 hours per week
        on manual outreach, right? CallKaro automates all of that. You
        upload a CSV, our AI calls everyone, books meetings automatically.
        ROI milega within first month itself. Interested in a quick demo?"

User:  "Sounds interesting. When can we do this?"

Agent: "Awesome! How about tomorrow 3 PM? I'll send you a Zoom link right now."

*[Automatically books meeting via Google Calendar + Zoom]*
```

---

## 🛠️ Advanced Configuration

### Custom Voice Settings

Edit `.env.local`:

```env
CALLKARO_AGENT_NAME=Priya  # Options: Raj, Arjun, Riya, Priya
```

### Working Hours

```typescript
const dialer = getAutoDialer({
  workingHoursStart: 10,  // 10 AM
  workingHoursEnd: 18,    // 6 PM
  workingDays: [1,2,3,4,5], // Mon-Fri
});
```

### Call Limits

```env
DIALER_MAX_CONCURRENT=1
DIALER_MIN_INTERVAL=5000  # 5 seconds
```

---

## 📞 Webhook URLs

Your Twilio webhooks need to point to:

- **TwiML**: `https://your-domain.com/webhooks/twilio/twiml`
- **Status**: `https://your-domain.com/webhooks/twilio/status`
- **Recording**: `https://your-domain.com/webhooks/twilio/recording`

For local development, use [ngrok](https://ngrok.com):

```bash
ngrok http 3001
# Use the ngrok URL as TWILIO_WEBHOOK_URL
```

---

## 🚢 Deployment

### Deploy to Fly.io

```bash
fly launch
fly secrets set LIVEKIT_URL=... TWILIO_ACCOUNT_SID=... # etc
fly deploy
```

### Deploy Webhooks to Fly.io

The same deployment handles both agent and webhooks on different ports.

---

## 📈 Monitoring & Analytics

### Real-time Call Monitoring

```typescript
const stats = dialer.getStats();
console.log(stats);
// {
//   totalCalls: 150,
//   successfulCalls: 120,
//   failedCalls: 30,
//   isRunning: true
// }
```

### Dashboard Stats

```typescript
const stats = await supabase.getDashboardStats();
// {
//   totalLeads: 500,
//   totalCalls: 150,
//   meetingsBooked: 45,
//   conversionRate: 30,
//   avgCallDuration: 180
// }
```

---

## 🔥 Pro Tips

1. **Test Your Prompts**: Tweak the agent instructions for your industry
2. **A/B Test Voices**: Try Raj vs Riya - different industries prefer different styles
3. **Optimize Working Hours**: Call when your prospects are most responsive
4. **Handle Objections**: Update objection handlers based on your analytics
5. **Pre-qualify Leads**: Higher quality leads = higher conversion
6. **Follow Up**: Use callback scheduling for warm leads

---

## 🤝 Contributing

Contributions welcome! Feel free to:
- Add new voices/accents
- Improve objection handling
- Add more integrations (HubSpot, Salesforce, etc.)
- Build the Next.js dashboard

---

## 📄 License

MIT License - See LICENSE file

---

## 🙏 Credits

Built with:
- [LiveKit Agents](https://docs.livekit.io/agents/)
- [Twilio](https://www.twilio.com/)
- [Deepgram](https://deepgram.com/)
- [Google Gemini](https://ai.google.dev/)
- [Cartesia](https://cartesia.ai/)
- [Supabase](https://supabase.com/)

---

## 📞 Support

Need help? Open an issue or reach out!

**Made with ❤️ for Indian startups. Ab har startup kar sakta hai sales at scale! 🚀**
