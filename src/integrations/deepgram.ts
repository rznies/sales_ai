/**
 * Deepgram Nova-2 STT Integration for CallKaro AI
 * Optimized for Indian English and Hinglish accents
 */

import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

export interface DeepgramConfig {
  model: string;
  language: string;
  punctuate: boolean;
  smart_format: boolean;
  interim_results: boolean;
  utterance_end_ms: number;
  vad_events: boolean;
}

/**
 * Deepgram STT Service
 * Handles speech-to-text with low latency for Indian accents
 */
export class DeepgramSTT {
  private client: any;
  private config: DeepgramConfig;

  constructor(config?: Partial<DeepgramConfig>) {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      throw new Error('DEEPGRAM_API_KEY is required');
    }

    this.client = createClient(apiKey);

    // Default config optimized for Indian English/Hinglish
    this.config = {
      model: 'nova-2',
      language: 'en-IN', // Indian English
      punctuate: true,
      smart_format: true,
      interim_results: true,
      utterance_end_ms: 1000,
      vad_events: true,
      ...config,
    };
  }

  /**
   * Create a live transcription stream
   */
  createLiveStream() {
    return this.client.listen.live({
      model: this.config.model,
      language: this.config.language,
      punctuate: this.config.punctuate,
      smart_format: this.config.smart_format,
      interim_results: this.config.interim_results,
      utterance_end_ms: this.config.utterance_end_ms,
      vad_events: this.config.vad_events,
      // Additional settings for better Indian accent recognition
      multichannel: false,
      numerals: true,
      profanity_filter: false, // We want raw transcripts
    });
  }

  /**
   * Transcribe audio file
   */
  async transcribeFile(audioBuffer: Buffer): Promise<string> {
    try {
      const { result, error } = await this.client.listen.prerecorded.transcribeFile(
        audioBuffer,
        {
          model: this.config.model,
          language: this.config.language,
          punctuate: this.config.punctuate,
          smart_format: this.config.smart_format,
        }
      );

      if (error) {
        throw new Error(`Deepgram transcription error: ${error.message}`);
      }

      const transcript = result.results.channels[0].alternatives[0].transcript;
      return transcript;
    } catch (error) {
      console.error('Deepgram transcription failed:', error);
      throw error;
    }
  }

  /**
   * Get current config
   */
  getConfig(): DeepgramConfig {
    return { ...this.config };
  }
}

/**
 * Factory function for easy instantiation
 */
export function createDeepgramSTT(config?: Partial<DeepgramConfig>): DeepgramSTT {
  return new DeepgramSTT(config);
}

/**
 * Export default instance
 */
export const deepgramSTT = new DeepgramSTT();
