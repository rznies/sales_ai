/**
 * Mock environment variables for testing
 */

export const mockEnv = {
  // LiveKit
  LIVEKIT_URL: 'wss://test.livekit.cloud',
  LIVEKIT_API_KEY: 'test_api_key',
  LIVEKIT_API_SECRET: 'test_api_secret',

  // AI Models
  DEEPGRAM_API_KEY: 'test_deepgram_key',
  GOOGLE_GEMINI_API_KEY: 'test_gemini_key',
  CARTESIA_API_KEY: 'test_cartesia_key',

  // Twilio
  TWILIO_ACCOUNT_SID: 'ACtest123',
  TWILIO_AUTH_TOKEN: 'test_token',
  TWILIO_PHONE_NUMBER: '+15555551234',
  TWILIO_WEBHOOK_URL: 'https://test.ngrok.io',

  // Supabase
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_SERVICE_KEY: 'test_service_key',
  SUPABASE_ANON_KEY: 'test_anon_key',

  // Google Calendar
  GOOGLE_CALENDAR_CLIENT_ID: 'test_client_id',
  GOOGLE_CALENDAR_CLIENT_SECRET: 'test_client_secret',
  GOOGLE_CALENDAR_REDIRECT_URI: 'http://localhost:3000/oauth2callback',
  GOOGLE_CALENDAR_REFRESH_TOKEN: 'test_refresh_token',

  // Zoom
  ZOOM_ACCOUNT_ID: 'test_zoom_account',
  ZOOM_CLIENT_ID: 'test_zoom_client',
  ZOOM_CLIENT_SECRET: 'test_zoom_secret',

  // CallKaro Config
  CALLKARO_AGENT_NAME: 'TestRaj',
  CALLKARO_COMPANY_NAME: 'Test Company',
  CALLKARO_PRODUCT_NAME: 'Test Product',
  CALLKARO_DEMO_DURATION_MINUTES: '15',
  CALLKARO_HUMAN_TRANSFER_NUMBER: '+15555559999',

  // Server
  PORT: '3000',
  WEBHOOK_PORT: '3001',
  NODE_ENV: 'test',
};

/**
 * Set mock environment variables
 */
export function setMockEnv(): void {
  Object.entries(mockEnv).forEach(([key, value]) => {
    process.env[key] = value;
  });
}

/**
 * Clear mock environment variables
 */
export function clearMockEnv(): void {
  Object.keys(mockEnv).forEach((key) => {
    delete process.env[key];
  });
}
