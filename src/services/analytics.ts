/**
 * Analytics Service for CallKaro AI
 * Tracks call performance, lead scoring, and conversion metrics
 */

import { supabase } from '../integrations/supabase.js';

export interface AnalyticsMetrics {
  period: 'today' | 'week' | 'month' | 'all';
  totalLeads: number;
  totalCalls: number;
  meetingsBooked: number;
  conversionRate: number;
  avgCallDuration: number;
  avgLeadScore: number;
  topObjections: Array<{ objection: string; count: number }>;
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
  callOutcomes: {
    interested: number;
    not_interested: number;
    meeting_booked: number;
    callback_requested: number;
    voicemail: number;
    no_answer: number;
    failed: number;
  };
}

/**
 * Analytics Service
 */
export class AnalyticsService {
  /**
   * Get comprehensive analytics for a time period
   */
  async getMetrics(period: 'today' | 'week' | 'month' | 'all' = 'all'): Promise<AnalyticsMetrics> {
    const dateFilter = this.getDateFilter(period);

    // Get dashboard stats
    const dashboardStats = await supabase.getDashboardStats();

    // Get recent calls for detailed analytics
    const recentCalls = await supabase.getRecentCalls(1000); // Get more for accurate analytics

    // Filter by period if needed
    const filteredCalls = dateFilter
      ? recentCalls.filter((call) => new Date(call.started_at!) >= dateFilter)
      : recentCalls;

    // Calculate sentiment distribution
    const sentiment = {
      positive: filteredCalls.filter((c) => c.sentiment === 'positive').length,
      neutral: filteredCalls.filter((c) => c.sentiment === 'neutral').length,
      negative: filteredCalls.filter((c) => c.sentiment === 'negative').length,
    };

    // Calculate call outcomes
    const callOutcomes = {
      interested: filteredCalls.filter((c) => c.outcome === 'interested').length,
      not_interested: filteredCalls.filter((c) => c.outcome === 'not_interested').length,
      meeting_booked: filteredCalls.filter((c) => c.outcome === 'meeting_booked').length,
      callback_requested: filteredCalls.filter((c) => c.outcome === 'callback_requested').length,
      voicemail: filteredCalls.filter((c) => c.outcome === 'voicemail').length,
      no_answer: filteredCalls.filter((c) => c.disposition === 'no_answer').length,
      failed: filteredCalls.filter((c) => c.status === 'failed').length,
    };

    // Extract top objections
    const objectionsMap: Record<string, number> = {};
    filteredCalls.forEach((call) => {
      if (call.objections_raised) {
        call.objections_raised.forEach((obj) => {
          objectionsMap[obj] = (objectionsMap[obj] || 0) + 1;
        });
      }
    });

    const topObjections = Object.entries(objectionsMap)
      .map(([objection, count]) => ({ objection, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate average lead score (placeholder - would need actual query)
    const avgLeadScore = 65; // TODO: Calculate from actual lead scores

    return {
      period,
      totalLeads: dashboardStats.totalLeads,
      totalCalls: filteredCalls.length,
      meetingsBooked: callOutcomes.meeting_booked,
      conversionRate:
        filteredCalls.length > 0 ? (callOutcomes.meeting_booked / filteredCalls.length) * 100 : 0,
      avgCallDuration: dashboardStats.avgCallDuration,
      avgLeadScore,
      topObjections,
      sentiment,
      callOutcomes,
    };
  }

  /**
   * Get date filter for period
   */
  private getDateFilter(period: 'today' | 'week' | 'month' | 'all'): Date | null {
    const now = new Date();

    switch (period) {
      case 'today':
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        return today;

      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return weekAgo;

      case 'month':
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return monthAgo;

      case 'all':
      default:
        return null;
    }
  }

  /**
   * Calculate estimated pipeline value
   * Based on meetings booked and average deal size
   */
  calculatePipelineValue(metrics: AnalyticsMetrics, avgDealSize: number = 100000): number {
    // Assume 30% of meetings convert to deals
    const expectedDeals = metrics.meetingsBooked * 0.3;
    return expectedDeals * avgDealSize;
  }

  /**
   * Generate analytics report
   */
  generateReport(metrics: AnalyticsMetrics, avgDealSize: number = 100000): string {
    const pipelineValue = this.calculatePipelineValue(metrics, avgDealSize);

    return `
📊 CallKaro AI Analytics Report (${metrics.period.toUpperCase()})
=================================================================

📞 Call Metrics:
   - Total Leads: ${metrics.totalLeads}
   - Total Calls: ${metrics.totalCalls}
   - Meetings Booked: ${metrics.meetingsBooked}
   - Conversion Rate: ${metrics.conversionRate.toFixed(2)}%
   - Avg Call Duration: ${Math.floor(metrics.avgCallDuration / 60)}m ${metrics.avgCallDuration % 60}s

💰 Pipeline:
   - Estimated Value: ₹${(pipelineValue / 100000).toFixed(2)}L

🎯 Call Outcomes:
   - Interested: ${metrics.callOutcomes.interested}
   - Not Interested: ${metrics.callOutcomes.not_interested}
   - Meeting Booked: ${metrics.callOutcomes.meeting_booked}
   - Callback Requested: ${metrics.callOutcomes.callback_requested}
   - Voicemail: ${metrics.callOutcomes.voicemail}
   - No Answer: ${metrics.callOutcomes.no_answer}
   - Failed: ${metrics.callOutcomes.failed}

😊 Sentiment:
   - Positive: ${metrics.sentiment.positive} (${((metrics.sentiment.positive / metrics.totalCalls) * 100).toFixed(1)}%)
   - Neutral: ${metrics.sentiment.neutral} (${((metrics.sentiment.neutral / metrics.totalCalls) * 100).toFixed(1)}%)
   - Negative: ${metrics.sentiment.negative} (${((metrics.sentiment.negative / metrics.totalCalls) * 100).toFixed(1)}%)

🚧 Top Objections:
${metrics.topObjections.map((obj, i) => `   ${i + 1}. ${obj.objection}: ${obj.count} times`).join('\n')}

=================================================================
Generated: ${new Date().toLocaleString('en-IN')}
`;
  }
}

/**
 * Export singleton instance
 */
export const analytics = new AnalyticsService();
