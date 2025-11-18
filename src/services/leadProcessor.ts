/**
 * Lead Processing Service for CallKaro AI
 * Handles CSV upload, parsing, and lead import
 */

import fs from 'fs';
import csv from 'csv-parser';
import { supabase, Lead } from '../integrations/supabase.js';
import { TwilioService } from '../integrations/twilio.js';

export interface CSVRow {
  name?: string;
  phone?: string;
  email?: string;
  company?: string;
  designation?: string;
  industry?: string;
  linkedin_url?: string;
  company_size?: string;
  location?: string;
  notes?: string;
  [key: string]: string | undefined; // Allow additional custom fields
}

export interface LeadImportResult {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{ row: number; error: string; data: CSVRow }>;
  leads: Lead[];
}

/**
 * Lead Processor Service
 */
export class LeadProcessor {
  private campaignId?: string;

  constructor(campaignId?: string) {
    this.campaignId = campaignId;
  }

  /**
   * Process CSV file and import leads
   */
  async processCSVFile(filePath: string): Promise<LeadImportResult> {
    return new Promise((resolve, reject) => {
      const results: CSVRow[] = [];
      const errors: Array<{ row: number; error: string; data: CSVRow }> = [];
      let rowNumber = 0;

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data: CSVRow) => {
          rowNumber++;
          try {
            // Validate required fields
            if (!data.name || !data.phone) {
              errors.push({
                row: rowNumber,
                error: 'Missing required fields: name and phone are required',
                data,
              });
              return;
            }

            // Validate phone format
            const formattedPhone = TwilioService.formatPhoneNumber(data.phone);
            if (!TwilioService.validatePhoneNumber(formattedPhone)) {
              errors.push({
                row: rowNumber,
                error: `Invalid phone number format: ${data.phone}`,
                data,
              });
              return;
            }

            results.push({
              ...data,
              phone: formattedPhone, // Store formatted phone
            });
          } catch (error: any) {
            errors.push({
              row: rowNumber,
              error: error.message,
              data,
            });
          }
        })
        .on('end', async () => {
          try {
            const importResult = await this.importLeads(results);
            importResult.errors = errors;
            resolve(importResult);
          } catch (error) {
            reject(error);
          }
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  /**
   * Import leads from parsed CSV data
   */
  async importLeads(csvRows: CSVRow[]): Promise<LeadImportResult> {
    const successful: Lead[] = [];
    const errors: Array<{ row: number; error: string; data: CSVRow }> = [];

    for (let i = 0; i < csvRows.length; i++) {
      const row = csvRows[i];

      try {
        // Check if lead with same phone already exists
        const existingLead = await supabase.getLeadByPhone(row.phone!);

        if (existingLead) {
          errors.push({
            row: i + 1,
            error: `Lead with phone ${row.phone} already exists`,
            data: row,
          });
          continue;
        }

        // Extract custom fields (any field not in standard schema)
        const standardFields = [
          'name',
          'phone',
          'email',
          'company',
          'designation',
          'industry',
          'linkedin_url',
          'company_size',
          'location',
          'notes',
        ];

        const customFields: Record<string, any> = {};
        Object.keys(row).forEach((key) => {
          if (!standardFields.includes(key) && row[key]) {
            customFields[key] = row[key];
          }
        });

        // Create lead object
        const lead: Lead = {
          name: row.name!,
          phone: row.phone!,
          email: row.email,
          company: row.company,
          designation: row.designation,
          industry: row.industry,
          linkedin_url: row.linkedin_url,
          company_size: row.company_size,
          location: row.location,
          notes: row.notes,
          campaign_id: this.campaignId,
          source: 'csv_upload',
          status: 'pending',
          priority: 5,
          custom_fields: Object.keys(customFields).length > 0 ? customFields : undefined,
        };

        // Create lead in database
        const createdLead = await supabase.createLead(lead);
        successful.push(createdLead);

        // Add to dialer queue
        await supabase.addToQueue({
          lead_id: createdLead.id!,
          status: 'queued',
          priority: lead.priority || 5,
        });
      } catch (error: any) {
        errors.push({
          row: i + 1,
          error: error.message,
          data: row,
        });
      }
    }

    return {
      total: csvRows.length,
      successful: successful.length,
      failed: errors.length,
      errors,
      leads: successful,
    };
  }

  /**
   * Import leads from array of objects
   */
  async importLeadsFromArray(leads: Partial<Lead>[]): Promise<LeadImportResult> {
    const successful: Lead[] = [];
    const errors: Array<{ row: number; error: string; data: any }> = [];

    for (let i = 0; i < leads.length; i++) {
      const leadData = leads[i];

      try {
        // Validate required fields
        if (!leadData.name || !leadData.phone) {
          errors.push({
            row: i + 1,
            error: 'Missing required fields: name and phone are required',
            data: leadData,
          });
          continue;
        }

        // Format and validate phone
        const formattedPhone = TwilioService.formatPhoneNumber(leadData.phone);
        if (!TwilioService.validatePhoneNumber(formattedPhone)) {
          errors.push({
            row: i + 1,
            error: `Invalid phone number format: ${leadData.phone}`,
            data: leadData,
          });
          continue;
        }

        // Check if lead exists
        const existingLead = await supabase.getLeadByPhone(formattedPhone);
        if (existingLead) {
          errors.push({
            row: i + 1,
            error: `Lead with phone ${formattedPhone} already exists`,
            data: leadData,
          });
          continue;
        }

        // Create lead
        const lead: Lead = {
          ...leadData,
          phone: formattedPhone,
          campaign_id: leadData.campaign_id || this.campaignId,
          source: leadData.source || 'api',
          status: leadData.status || 'pending',
          priority: leadData.priority || 5,
        } as Lead;

        const createdLead = await supabase.createLead(lead);
        successful.push(createdLead);

        // Add to queue
        await supabase.addToQueue({
          lead_id: createdLead.id!,
          status: 'queued',
          priority: lead.priority || 5,
        });
      } catch (error: any) {
        errors.push({
          row: i + 1,
          error: error.message,
          data: leadData,
        });
      }
    }

    return {
      total: leads.length,
      successful: successful.length,
      failed: errors.length,
      errors,
      leads: successful,
    };
  }

  /**
   * Enrich lead data (optional - can be extended)
   * Placeholder for future LinkedIn scraping or data enrichment
   */
  async enrichLead(lead: Lead): Promise<Lead> {
    // TODO: Implement LinkedIn scraping or other enrichment
    // For now, just return the lead as-is

    console.log(`📊 Enrichment for ${lead.name} - TODO: Implement`);

    return lead;
  }

  /**
   * Validate CSV file format
   */
  static async validateCSVFile(filePath: string): Promise<{
    valid: boolean;
    errors: string[];
    preview: CSVRow[];
  }> {
    return new Promise((resolve) => {
      const results: CSVRow[] = [];
      const errors: string[] = [];
      let rowCount = 0;

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data: CSVRow) => {
          rowCount++;

          // Only collect first 5 rows for preview
          if (rowCount <= 5) {
            results.push(data);
          }

          // Validate required columns
          if (!data.name) {
            errors.push(`Row ${rowCount}: Missing 'name' column`);
          }
          if (!data.phone) {
            errors.push(`Row ${rowCount}: Missing 'phone' column`);
          }
        })
        .on('end', () => {
          resolve({
            valid: errors.length === 0,
            errors,
            preview: results,
          });
        })
        .on('error', (error) => {
          resolve({
            valid: false,
            errors: [error.message],
            preview: [],
          });
        });
    });
  }

  /**
   * Generate CSV template
   */
  static generateCSVTemplate(): string {
    const headers = [
      'name',
      'phone',
      'email',
      'company',
      'designation',
      'industry',
      'linkedin_url',
      'company_size',
      'location',
      'notes',
    ];

    const sampleData = [
      {
        name: 'Rahul Sharma',
        phone: '+919876543210',
        email: 'rahul@example.com',
        company: 'Tech Startup Pvt Ltd',
        designation: 'CTO',
        industry: 'Technology',
        linkedin_url: 'https://linkedin.com/in/rahulsharma',
        company_size: '10-50',
        location: 'Bangalore',
        notes: 'Interested in SaaS products',
      },
      {
        name: 'Priya Patel',
        phone: '+919123456789',
        email: 'priya@example.com',
        company: 'E-commerce Solutions',
        designation: 'CEO',
        industry: 'E-commerce',
        linkedin_url: 'https://linkedin.com/in/priyapatel',
        company_size: '50-200',
        location: 'Mumbai',
        notes: 'Looking for automation tools',
      },
    ];

    const csvContent = [
      headers.join(','),
      ...sampleData.map((row) => headers.map((h) => `"${row[h as keyof typeof row] || ''}"`).join(',')),
    ].join('\n');

    return csvContent;
  }
}

/**
 * Export convenience function
 */
export async function processLeadsFromCSV(
  filePath: string,
  campaignId?: string
): Promise<LeadImportResult> {
  const processor = new LeadProcessor(campaignId);
  return await processor.processCSVFile(filePath);
}

/**
 * Export template generator
 */
export function generateLeadCSVTemplate(): string {
  return LeadProcessor.generateCSVTemplate();
}
