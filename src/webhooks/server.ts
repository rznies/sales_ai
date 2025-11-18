/**
 * Webhook Server for CallKaro AI
 * Runs Express server to handle Twilio webhooks
 */

import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import twilioWebhooks from './twilio.js';

dotenv.config({ path: '.env.local' });

const app = express();
const PORT = parseInt(process.env.WEBHOOK_PORT || '3001');

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Request logging
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Mount Twilio webhooks
app.use('/webhooks/twilio', twilioWebhooks);

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    service: 'CallKaro AI Webhook Server',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      twilio_twiml: '/webhooks/twilio/twiml',
      twilio_status: '/webhooks/twilio/status',
      twilio_recording: '/webhooks/twilio/recording',
      twilio_transfer: '/webhooks/twilio/transfer',
      health: '/webhooks/twilio/health',
    },
  });
});

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// Error handling
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('❌ Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 CallKaro AI Webhook Server running on port ${PORT}`);
  console.log(`📡 Webhook URL: http://localhost:${PORT}/webhooks/twilio`);
  console.log(`\n🔗 Endpoints:`);
  console.log(`   - TwiML:     POST /webhooks/twilio/twiml`);
  console.log(`   - Status:    POST /webhooks/twilio/status`);
  console.log(`   - Recording: POST /webhooks/twilio/recording`);
  console.log(`   - Transfer:  POST /webhooks/twilio/transfer`);
  console.log(`   - Health:    GET  /webhooks/twilio/health`);
  console.log(`\n✅ Server ready to receive Twilio webhooks!\n`);
});

export default app;
