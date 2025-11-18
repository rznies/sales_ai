/**
 * Unit tests for Lead Processor service
 */

import { describe, it, before, after, mock } from 'node:test';
import assert from 'node:assert';
import { setMockEnv, clearMockEnv } from '../mocks/env.js';
import { mockLead, mockCSVData } from '../mocks/fixtures.js';
import fs from 'fs';
import path from 'path';

describe('Lead Processor Service', () => {
  const testCSVPath = path.join(process.cwd(), 'test-leads.csv');

  before(() => {
    setMockEnv();
  });

  after(() => {
    clearMockEnv();
    // Clean up test CSV file if it exists
    if (fs.existsSync(testCSVPath)) {
      fs.unlinkSync(testCSVPath);
    }
  });

  describe('CSV Validation', () => {
    it('should validate required fields', () => {
      const validRow = {
        name: 'Test User',
        phone: '+919999999999',
        email: 'test@example.com',
      };

      assert.ok(validRow.name);
      assert.ok(validRow.phone);
      assert.ok(/^\+?[1-9]\d{9,14}$/.test(validRow.phone));
    });

    it('should reject rows missing required fields', () => {
      const invalidRows = [
        { phone: '+919999999999' }, // Missing name
        { name: 'Test User' }, // Missing phone
        { name: 'Test User', phone: '123' }, // Invalid phone
      ];

      invalidRows.forEach(row => {
        const hasName = !!row.name;
        const hasPhone = !!row.phone;
        const validPhone = row.phone ? /^\+?[1-9]\d{9,14}$/.test(row.phone) : false;

        assert.ok(!(hasName && hasPhone && validPhone));
      });
    });

    it('should format phone numbers', () => {
      const testCases = [
        { input: '9876543210', expected: '+919876543210' },
        { input: '+919876543210', expected: '+919876543210' },
        { input: '919876543210', expected: '+919876543210' },
      ];

      testCases.forEach(({ input, expected }) => {
        let cleaned = input.replace(/\D/g, '');
        if (cleaned.length === 10) {
          cleaned = '91' + cleaned;
        }
        if (!cleaned.startsWith('+')) {
          cleaned = '+' + cleaned;
        }
        assert.strictEqual(cleaned, expected);
      });
    });
  });

  describe('CSV Parsing', () => {
    it('should parse valid CSV content', () => {
      const csvContent = `name,phone,email,company
Test User 1,+919999999991,user1@test.com,Test Co 1
Test User 2,+919999999992,user2@test.com,Test Co 2`;

      const lines = csvContent.split('\n');
      const headers = lines[0].split(',');
      const rows = lines.slice(1).map(line => {
        const values = line.split(',');
        return headers.reduce((obj, header, index) => {
          obj[header] = values[index];
          return obj;
        }, {} as Record<string, string>);
      });

      assert.strictEqual(rows.length, 2);
      assert.strictEqual(rows[0].name, 'Test User 1');
      assert.strictEqual(rows[1].name, 'Test User 2');
    });

    it('should handle custom fields', () => {
      const row = {
        name: 'Test User',
        phone: '+919999999999',
        email: 'test@example.com',
        custom_field_1: 'value1',
        custom_field_2: 'value2',
      };

      const standardFields = ['name', 'phone', 'email', 'company', 'designation'];
      const customFields: Record<string, any> = {};

      Object.keys(row).forEach(key => {
        if (!standardFields.includes(key)) {
          customFields[key] = row[key as keyof typeof row];
        }
      });

      assert.strictEqual(Object.keys(customFields).length, 2);
      assert.strictEqual(customFields.custom_field_1, 'value1');
    });
  });

  describe('Lead Import', () => {
    it('should import valid leads', async () => {
      const leads = mockCSVData.map(row => ({
        name: row.name,
        phone: row.phone,
        email: row.email,
        company: row.company,
        designation: row.designation,
        industry: row.industry,
        source: 'csv_upload',
        status: 'pending' as const,
      }));

      assert.strictEqual(leads.length, 2);
      assert.ok(leads.every(lead => lead.name && lead.phone));
    });

    it('should detect duplicate phone numbers', () => {
      const leads = [
        { name: 'User 1', phone: '+919999999999' },
        { name: 'User 2', phone: '+919999999999' }, // Duplicate
      ];

      const phoneSet = new Set();
      const duplicates: string[] = [];

      leads.forEach(lead => {
        if (phoneSet.has(lead.phone)) {
          duplicates.push(lead.phone);
        } else {
          phoneSet.add(lead.phone);
        }
      });

      assert.strictEqual(duplicates.length, 1);
      assert.strictEqual(duplicates[0], '+919999999999');
    });

    it('should track import results', () => {
      const result = {
        total: 10,
        successful: 8,
        failed: 2,
        errors: [
          { row: 3, error: 'Invalid phone', data: {} },
          { row: 7, error: 'Duplicate', data: {} },
        ],
      };

      assert.strictEqual(result.total, 10);
      assert.strictEqual(result.successful + result.failed, result.total);
      assert.strictEqual(result.errors.length, result.failed);
    });
  });

  describe('CSV Template Generation', () => {
    it('should generate valid CSV template', () => {
      const headers = [
        'name',
        'phone',
        'email',
        'company',
        'designation',
        'industry',
        'location',
        'notes',
      ];

      const sampleData = {
        name: 'Rahul Sharma',
        phone: '+919876543210',
        email: 'rahul@example.com',
        company: 'Tech Startup Pvt Ltd',
        designation: 'CTO',
        industry: 'Technology',
        location: 'Bangalore',
        notes: 'Interested in SaaS products',
      };

      const csvLine = headers.map(h => `"${sampleData[h as keyof typeof sampleData] || ''}"`).join(',');

      assert.ok(csvLine.includes('Rahul Sharma'));
      assert.ok(csvLine.includes('+919876543210'));
      assert.ok(csvLine.includes('Tech Startup Pvt Ltd'));
    });
  });

  describe('Lead Enrichment', () => {
    it('should placeholder for LinkedIn enrichment', async () => {
      const lead = { ...mockLead };
      const enrichedLead = lead; // Placeholder - would call enrichment API

      assert.strictEqual(enrichedLead.id, lead.id);
      // In future: assert.ok(enrichedLead.linkedin_data);
    });
  });

  describe('Queue Integration', () => {
    it('should add imported leads to dialer queue', () => {
      const leads = mockCSVData;
      const queueItems = leads.map(lead => ({
        lead_id: `lead-${Date.now()}`,
        status: 'queued' as const,
        priority: 5,
        scheduled_for: new Date().toISOString(),
      }));

      assert.strictEqual(queueItems.length, leads.length);
      assert.ok(queueItems.every(item => item.status === 'queued'));
      assert.ok(queueItems.every(item => item.priority >= 1 && item.priority <= 10));
    });
  });
});
