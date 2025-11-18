/**
 * Auto-Dialer Orchestration for CallKaro AI
 * Manages sequential outbound calling from the queue
 */

import { getTwilioService } from '../integrations/twilio.js';
import { supabase, DialerQueueItem } from '../integrations/supabase.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

export interface DialerConfig {
  maxConcurrentCalls: number;
  minCallInterval: number; // milliseconds between calls
  retryAttempts: number;
  retryDelay: number; // milliseconds
  workingHoursStart: number; // Hour (0-23)
  workingHoursEnd: number; // Hour (0-23)
  workingDays: number[]; // 0=Sunday, 1=Monday, etc.
}

export interface DialerStats {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  queuedLeads: number;
  isRunning: boolean;
  lastCallTime?: Date;
}

/**
 * Auto-Dialer Service
 * Orchestrates outbound calls from the queue
 */
export class AutoDialer {
  private config: DialerConfig;
  private isRunning: boolean = false;
  private currentCalls: number = 0;
  private stats: DialerStats = {
    totalCalls: 0,
    successfulCalls: 0,
    failedCalls: 0,
    queuedLeads: 0,
    isRunning: false,
  };
  private twilioService = getTwilioService();

  constructor(config?: Partial<DialerConfig>) {
    this.config = {
      maxConcurrentCalls: 1, // Sequential calling for now
      minCallInterval: 5000, // 5 seconds between calls
      retryAttempts: 3,
      retryDelay: 3600000, // 1 hour
      workingHoursStart: 10, // 10 AM
      workingHoursEnd: 18, // 6 PM
      workingDays: [1, 2, 3, 4, 5], // Monday-Friday
      ...config,
    };
  }

  /**
   * Start the auto-dialer
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️  Dialer is already running');
      return;
    }

    this.isRunning = true;
    this.stats.isRunning = true;

    console.log('🚀 Auto-Dialer started');
    console.log(`⏰ Working hours: ${this.config.workingHoursStart}:00 - ${this.config.workingHoursEnd}:00`);
    console.log(`📅 Working days: ${this.config.workingDays.join(', ')}`);
    console.log(`🔄 Max concurrent calls: ${this.config.maxConcurrentCalls}`);

    // Start processing queue
    this.processQueue();
  }

  /**
   * Stop the auto-dialer
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('⚠️  Dialer is not running');
      return;
    }

    this.isRunning = false;
    this.stats.isRunning = false;

    console.log('🛑 Auto-Dialer stopped');
    console.log(`📊 Final stats:`, this.stats);
  }

  /**
   * Process the dialer queue
   */
  private async processQueue(): Promise<void> {
    while (this.isRunning) {
      try {
        // Check if we're within working hours
        if (!this.isWithinWorkingHours()) {
          console.log('⏰ Outside working hours. Waiting...');
          await this.sleep(60000); // Check again in 1 minute
          continue;
        }

        // Check if we can make more calls
        if (this.currentCalls >= this.config.maxConcurrentCalls) {
          await this.sleep(1000); // Wait 1 second and check again
          continue;
        }

        // Get next lead from queue
        const queueItem = await supabase.getNextQueuedLead();

        if (!queueItem) {
          console.log('📭 No leads in queue. Waiting...');
          await this.sleep(10000); // Wait 10 seconds and check again
          continue;
        }

        // Process the call
        await this.processCall(queueItem);

        // Wait before next call
        await this.sleep(this.config.minCallInterval);
      } catch (error: any) {
        console.error('❌ Queue processing error:', error.message);
        await this.sleep(5000); // Wait 5 seconds before retrying
      }
    }
  }

  /**
   * Process a single call
   */
  private async processCall(queueItem: DialerQueueItem & { lead: any }): Promise<void> {
    const { lead } = queueItem;

    try {
      console.log(`\n📞 Calling ${lead.name} (${lead.phone})...`);

      // Update queue status to calling
      await supabase.updateQueueStatus(queueItem.id!, 'calling');

      // Increment current calls
      this.currentCalls++;

      // Make the call
      const callSid = await this.twilioService.makeCall({
        to: lead.phone,
        leadId: lead.id,
        customParameters: {
          leadName: lead.name,
          leadCompany: lead.company || '',
        },
      });

      console.log(`✅ Call initiated: ${callSid}`);

      this.stats.totalCalls++;
      this.stats.successfulCalls++;
      this.stats.lastCallTime = new Date();

      // Update queue status to completed
      await supabase.updateQueueStatus(queueItem.id!, 'completed');

      // Decrement current calls after a delay (call is now being handled)
      setTimeout(() => {
        this.currentCalls--;
      }, 5000);
    } catch (error: any) {
      console.error(`❌ Call failed for ${lead.name}:`, error.message);

      this.stats.totalCalls++;
      this.stats.failedCalls++;
      this.currentCalls--;

      // Handle retry logic
      const retryCount = (queueItem.retry_count || 0) + 1;

      if (retryCount < this.config.retryAttempts) {
        console.log(`🔄 Scheduling retry ${retryCount}/${this.config.retryAttempts} for ${lead.name}`);

        // Schedule retry
        const nextRetryTime = new Date(Date.now() + this.config.retryDelay);

        await supabase.updateCall(queueItem.id!, {
          status: 'failed',
          retry_count: retryCount,
          next_retry_at: nextRetryTime.toISOString(),
          scheduled_for: nextRetryTime.toISOString(),
        } as any);
      } else {
        console.log(`❌ Max retries reached for ${lead.name}. Marking as failed.`);

        await supabase.updateQueueStatus(queueItem.id!, 'failed');

        // Update lead status
        await supabase.updateLead(lead.id, {
          notes: `Failed after ${retryCount} attempts: ${error.message}`,
        });
      }
    }
  }

  /**
   * Check if current time is within working hours
   */
  private isWithinWorkingHours(): boolean {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();

    // Check if current day is a working day
    if (!this.config.workingDays.includes(currentDay)) {
      return false;
    }

    // Check if current hour is within working hours
    if (currentHour < this.config.workingHoursStart || currentHour >= this.config.workingHoursEnd) {
      return false;
    }

    return true;
  }

  /**
   * Helper to sleep for a given duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current stats
   */
  getStats(): DialerStats {
    return { ...this.stats };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<DialerConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };

    console.log('⚙️  Dialer configuration updated:', this.config);
  }

  /**
   * Get queue size
   */
  async getQueueSize(): Promise<number> {
    // This would be a custom query in production
    // For now, we'll use a placeholder
    return this.stats.queuedLeads;
  }

  /**
   * Pause dialer
   */
  pause(): void {
    if (!this.isRunning) {
      console.log('⚠️  Dialer is not running');
      return;
    }

    this.isRunning = false;
    console.log('⏸️  Dialer paused');
  }

  /**
   * Resume dialer
   */
  resume(): void {
    if (this.isRunning) {
      console.log('⚠️  Dialer is already running');
      return;
    }

    this.isRunning = true;
    console.log('▶️  Dialer resumed');
    this.processQueue();
  }
}

/**
 * Export singleton instance
 */
let autoDialerInstance: AutoDialer | null = null;

export function getAutoDialer(config?: Partial<DialerConfig>): AutoDialer {
  if (!autoDialerInstance) {
    autoDialerInstance = new AutoDialer(config);
  }
  return autoDialerInstance;
}

/**
 * CLI entry point for running the dialer
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('\n🚀 CallKaro AI Auto-Dialer\n');

  const dialer = getAutoDialer({
    maxConcurrentCalls: parseInt(process.env.DIALER_MAX_CONCURRENT || '1'),
    minCallInterval: parseInt(process.env.DIALER_MIN_INTERVAL || '5000'),
    workingHoursStart: parseInt(process.env.DIALER_WORKING_HOURS_START || '10'),
    workingHoursEnd: parseInt(process.env.DIALER_WORKING_HOURS_END || '18'),
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down dialer...');
    dialer.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n\n👋 Shutting down dialer...');
    dialer.stop();
    process.exit(0);
  });

  // Start the dialer
  dialer.start().catch((error) => {
    console.error('❌ Failed to start dialer:', error);
    process.exit(1);
  });

  // Print stats every minute
  setInterval(() => {
    const stats = dialer.getStats();
    console.log('\n📊 Dialer Stats:', stats);
  }, 60000);
}
