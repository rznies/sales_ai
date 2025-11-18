/**
 * Cartesia Sonic 3 TTS Configuration for CallKaro AI
 * Hinglish voices optimized for Indian accents (Delhi/Mumbai style)
 */

import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

/**
 * Cartesia Voice Profiles for Indian Sales Personas
 *
 * Cartesia Sonic 3 offers various voices. We'll configure Indian-sounding voices
 * for authentic Hinglish conversations.
 */

export interface CartesiaVoiceConfig {
  id: string;
  name: string;
  gender: 'male' | 'female';
  accent: string;
  description: string;
  suitable_for: string[];
}

/**
 * Available Indian voices for CallKaro AI
 * Note: These are Cartesia Sonic voice IDs - adjust based on actual available voices
 */
export const CALLKARO_VOICES: Record<string, CartesiaVoiceConfig> = {
  // Male voices
  RAJ_DELHI: {
    id: '9626c31c-bec5-4cca-baa8-f8ba9e84c8bc', // Cartesia "Confident British Male" - can adapt to Indian accent
    name: 'Raj (Delhi)',
    gender: 'male',
    accent: 'Indian English - Delhi',
    description: 'Confident, energetic male voice with Delhi accent. Perfect for B2B sales.',
    suitable_for: ['outbound_sales', 'b2b', 'tech_sales'],
  },
  ARJUN_MUMBAI: {
    id: 'a167e0f3-df7e-4d52-a9c3-f949145efdab', // Cartesia "Friendly American Male"
    name: 'Arjun (Mumbai)',
    gender: 'male',
    accent: 'Indian English - Mumbai',
    description: 'Friendly, approachable male voice with Mumbai accent. Great for SMB outreach.',
    suitable_for: ['smb_sales', 'relationship_building', 'follow_ups'],
  },

  // Female voices
  RIYA_DELHI: {
    id: '79f8b5fb-2cc8-479a-80df-29f7a7cf1a3e', // Cartesia "Confident British Female"
    name: 'Riya (Delhi)',
    gender: 'female',
    accent: 'Indian English - Delhi',
    description: 'Professional, confident female voice with Delhi accent. Excellent for enterprise sales.',
    suitable_for: ['enterprise_sales', 'executive_outreach', 'professional_services'],
  },
  PRIYA_BANGALORE: {
    id: '6fb9a0ae-5d7c-4c2f-b60b-3d1d9b9c5c5e', // Cartesia "Warm American Female"
    name: 'Priya (Bangalore)',
    gender: 'female',
    accent: 'Indian English - Bangalore',
    description: 'Warm, friendly female voice with Bangalore accent. Perfect for tech/startup sales.',
    suitable_for: ['tech_sales', 'startup_outreach', 'customer_success'],
  },
};

/**
 * Get voice config by agent name
 */
export function getVoiceForAgent(agentName: string): CartesiaVoiceConfig {
  const voiceMap: Record<string, string> = {
    raj: 'RAJ_DELHI',
    arjun: 'ARJUN_MUMBAI',
    riya: 'RIYA_DELHI',
    priya: 'PRIYA_BANGALORE',
  };

  const voiceKey = voiceMap[agentName.toLowerCase()] || 'RAJ_DELHI';
  return CALLKARO_VOICES[voiceKey];
}

/**
 * Get default voice based on environment config
 */
export function getDefaultVoice(): CartesiaVoiceConfig {
  const agentName = process.env.CALLKARO_AGENT_NAME || 'Raj';
  return getVoiceForAgent(agentName);
}

/**
 * Cartesia TTS Configuration for LiveKit Agents
 */
export interface CartesiaTTSConfig {
  model: string;
  voice: string;
  language: string;
  encoding: string;
  sample_rate: number;
  speed: number; // 0.5 to 2.0
  emotion?: string[]; // Emotional expressions
}

/**
 * Get Cartesia TTS config for CallKaro AI
 */
export function getCartesiaConfig(voiceConfig?: CartesiaVoiceConfig): CartesiaTTSConfig {
  const voice = voiceConfig || getDefaultVoice();

  return {
    model: 'sonic-3', // Cartesia Sonic 3 - latest and fastest
    voice: voice.id,
    language: 'en', // English with Indian accent
    encoding: 'pcm_16000', // 16kHz PCM for telephony
    sample_rate: 16000, // Standard for phone calls
    speed: 1.1, // Slightly faster for energetic sales vibe
    emotion: ['confident', 'friendly'], // Emotional tone
  };
}

/**
 * Voice customization presets for different scenarios
 */
export const VOICE_PRESETS = {
  OPENING_PITCH: {
    speed: 1.2, // Faster, energetic
    emotion: ['excited', 'confident'],
  },
  HANDLING_OBJECTION: {
    speed: 1.0, // Normal, calm
    emotion: ['empathetic', 'understanding'],
  },
  CLOSING: {
    speed: 1.1, // Slightly faster
    emotion: ['confident', 'persuasive'],
  },
  CALLBACK_SCHEDULING: {
    speed: 1.0, // Normal
    emotion: ['professional', 'friendly'],
  },
};

/**
 * Adjust voice settings based on conversation stage
 */
export function getVoiceForStage(stage: keyof typeof VOICE_PRESETS): Partial<CartesiaTTSConfig> {
  return VOICE_PRESETS[stage];
}

/**
 * Export Cartesia configuration
 */
export const cartesiaConfig = getCartesiaConfig();

/**
 * Validate Cartesia API key
 */
export function validateCartesiaConfig(): boolean {
  const apiKey = process.env.CARTESIA_API_KEY;
  if (!apiKey) {
    console.warn('⚠️  CARTESIA_API_KEY not found. TTS will not work!');
    return false;
  }
  return true;
}
