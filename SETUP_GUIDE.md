# 🚀 CallKaro AI - Complete Setup Guide

This guide will walk you through setting up CallKaro AI from scratch.

---

## 📋 Prerequisites Checklist

- [ ] Node.js >= 22 installed
- [ ] pnpm >= 10 installed
- [ ] Git installed
- [ ] Text editor (VS Code recommended)

---

## 🔑 API Keys Required

You'll need accounts and API keys from these services:

### 1. LiveKit Cloud (FREE)
- Go to: https://cloud.livekit.io/
- Create account
- Create new project
- Copy: URL, API Key, API Secret

### 2. Twilio (FREE tier available)
- Go to: https://www.twilio.com/try-twilio
- Sign up
- Buy a phone number (or use trial number)
- Copy: Account SID, Auth Token, Phone Number
- Set up webhooks (we'll do this later)

### 3. Deepgram (FREE $200 credit)
- Go to: https://deepgram.com/
- Sign up
- Get API key from dashboard
- Copy: API Key

### 4. Google Cloud (FREE tier)
- Go to: https://console.cloud.google.com/
- Enable these APIs:
  - Google Generative AI (Gemini)
  - Google Calendar API
- Create OAuth credentials for Calendar
- Copy: Gemini API Key, Calendar credentials

### 5. Supabase (FREE tier)
- Go to: https://supabase.com/
- Create new project
- Go to Settings → API
- Copy: URL, Service Key

### 6. Cartesia (FREE tier)
- Go to: https://cartesia.ai/
- Sign up for beta
- Get API key
- Copy: API Key

### 7. Zoom (Optional, FREE)
- Go to: https://marketplace.zoom.us/
- Create Server-to-Server OAuth app
- Copy: Account ID, Client ID, Client Secret

---

## 📥 Installation Steps

### Step 1: Clone & Install

```bash
git clone <your-repo-url>
cd sales_ai
pnpm install
```

### Step 2: Environment Configuration

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in ALL the API keys you collected:

```env
# LiveKit Cloud
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=APIxxxxxxxxx
LIVEKIT_API_SECRET=xxxxxxxxx

# AI Model APIs
DEEPGRAM_API_KEY=xxxxxxxxx
GOOGLE_GEMINI_API_KEY=AIzaxxxxxxxxx
CARTESIA_API_KEY=xxxxxxxxx

# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WEBHOOK_URL=https://your-ngrok-url.ngrok.io

# Supabase Configuration
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google Calendar API (OAuth)
GOOGLE_CALENDAR_CLIENT_ID=xxxxxx.apps.googleusercontent.com
GOOGLE_CALENDAR_CLIENT_SECRET=GOCSPX-xxxxxx
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:3000/oauth2callback
GOOGLE_CALENDAR_REFRESH_TOKEN=1//xxxxxx

# Zoom API (Server-to-Server OAuth)
ZOOM_ACCOUNT_ID=xxxxxx
ZOOM_CLIENT_ID=xxxxxx
ZOOM_CLIENT_SECRET=xxxxxx

# CallKaro AI Configuration
CALLKARO_AGENT_NAME=Raj
CALLKARO_COMPANY_NAME=My Awesome Startup
CALLKARO_PRODUCT_NAME=My Product
CALLKARO_DEMO_DURATION_MINUTES=15
CALLKARO_HUMAN_TRANSFER_NUMBER=+919999999999
```

### Step 3: Google Calendar OAuth Setup

This is the trickiest part. Follow these steps:

1. Go to Google Cloud Console
2. APIs & Services → Credentials
3. Create OAuth 2.0 Client ID
4. Application type: Web application
5. Authorized redirect URIs: `http://localhost:3000/oauth2callback`
6. Download credentials JSON

**Get Refresh Token:**

Use this Node.js script to get your refresh token:

```javascript
// get-refresh-token.js
const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  'YOUR_CLIENT_ID',
  'YOUR_CLIENT_SECRET',
  'http://localhost:3000/oauth2callback'
);

const url = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/calendar'],
});

console.log('Authorize this app by visiting:', url);

// After authorizing, you'll get a code. Use it to get tokens:
// oauth2Client.getToken(code).then(({ tokens }) => {
//   console.log('Refresh Token:', tokens.refresh_token);
// });
```

Run it, authorize, and copy the refresh token to `.env.local`.

### Step 4: Supabase Database Setup

1. Go to your Supabase project
2. Click "SQL Editor"
3. Copy contents of `supabase/schema.sql`
4. Paste and run in SQL editor
5. Verify tables were created

### Step 5: Download AI Models

```bash
pnpm run download-files
```

This downloads the Silero VAD model needed for voice activity detection.

### Step 6: Setup ngrok (for local development)

```bash
# Install ngrok
npm install -g ngrok

# Start ngrok
ngrok http 3001
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`) and update `.env.local`:

```env
TWILIO_WEBHOOK_URL=https://abc123.ngrok.io
```

### Step 7: Configure Twilio Webhooks

1. Go to Twilio Console → Phone Numbers
2. Click your phone number
3. Configure Voice & Fax:
   - **A CALL COMES IN**: Webhook - `https://your-ngrok-url.ngrok.io/webhooks/twilio/twiml`
   - **METHOD**: POST
4. Click Save

---

## ▶️ Running CallKaro AI

### Terminal 1: Start Webhook Server

```bash
pnpm run webhooks
```

You should see:
```
🚀 CallKaro AI Webhook Server running on port 3001
```

### Terminal 2: Start LiveKit Agent

```bash
pnpm run dev
```

You should see:
```
✅ VAD model preloaded
🚀 CallKaro AI Agent Starting...
```

### Terminal 3: Start Auto-Dialer (Optional)

```bash
pnpm run dialer
```

---

## 🧪 Testing

### Test 1: Upload Sample Leads

Create `test-leads.csv`:

```csv
name,phone,email,company,designation
Test User,+919999999999,test@example.com,Test Company,CEO
```

Import leads:

```bash
node -e "
const { processLeadsFromCSV } = require('./dist/services/leadProcessor.js');
processLeadsFromCSV('./test-leads.csv').then(result => {
  console.log('Imported:', result.successful, 'leads');
});
"
```

### Test 2: Make a Test Call

```bash
node -e "
const { getTwilioService } = require('./dist/integrations/twilio.js');
const twilio = getTwilioService();
twilio.makeCall({ to: '+919999999999' }).then(sid => {
  console.log('Call initiated:', sid);
});
"
```

Replace with your actual phone number!

### Test 3: Check Database

Go to Supabase Dashboard → Table Editor → Check `leads`, `calls` tables.

---

## 🚨 Troubleshooting

### Issue: "Twilio webhook not receiving requests"

**Solution:**
- Make sure ngrok is running
- Update `TWILIO_WEBHOOK_URL` in `.env.local`
- Restart webhook server
- Check ngrok web interface at `http://localhost:4040`

### Issue: "Google Calendar API error"

**Solution:**
- Verify refresh token is valid
- Check scopes include `calendar`
- Make sure Calendar API is enabled in Google Cloud Console

### Issue: "Deepgram connection failed"

**Solution:**
- Verify API key is correct
- Check Deepgram quota
- Try with a different model (e.g., `nova-2-general`)

### Issue: "LiveKit connection timeout"

**Solution:**
- Verify LiveKit URL, API Key, Secret are correct
- Check if LiveKit Cloud project is active
- Try creating a new project

### Issue: "Supabase RLS error"

**Solution:**
- Use `SUPABASE_SERVICE_KEY` (not anon key) for backend operations
- Disable RLS for testing:
  ```sql
  ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
  ```

---

## 🎯 Next Steps

1. **Customize Agent**: Edit `src/agent.ts` to change the sales pitch
2. **Add Leads**: Upload your real CSV with leads
3. **Start Calling**: Run the dialer and watch it work!
4. **Monitor**: Check Supabase for call logs and transcripts
5. **Optimize**: Analyze top objections and improve responses

---

## 🚀 Production Deployment

See `DEPLOYMENT.md` for deploying to Fly.io and Vercel.

---

## 📞 Need Help?

- Check the main `CALLKARO_README.md`
- Open an issue on GitHub
- Join our Discord (coming soon)

**Happy Calling! 📞🔥**
