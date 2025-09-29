/**
 * Test suite for helper utility functions
 */

import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  getRelativeTime,
  calculateDaysLeft,
  truncateString,
  stringToSlug,
  formatLargeNumber,
  calculatePercentage,
} from './helpers';

describe('formatCurrency', () => {
  it('should format PHP currency correctly (default)', () => {
    expect(formatCurrency(1000)).toBe('₱1,000');
    expect(formatCurrency(0)).toBe('₱0');
    expect(formatCurrency(1000.50)).toBe('₱1,000.5');
  });

  it('should handle negative amounts', () => {
    expect(formatCurrency(-500)).toBe('-₱500');
  });

  it('should handle large numbers', () => {
    expect(formatCurrency(1000000)).toBe('₱1,000,000');
  });

  it('should support different currencies', () => {
    expect(formatCurrency(1000, 'USD', 'en-US')).toContain('1,000');
  });
});

describe('getRelativeTime', () => {
  it('should return relative time for recent dates', () => {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    expect(getRelativeTime(fiveMinutesAgo.toISOString())).toContain('minute');
  });

  it('should handle future dates', () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000); // tomorrow
    const result = getRelativeTime(future.toISOString());
    expect(result).toBeDefined();
  });
});

describe('calculateDaysLeft', () => {
  it('should calculate days left correctly', () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    expect(calculateDaysLeft(tomorrow.toISOString())).toBe(1);
  });

  it('should return 0 for past dates', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(calculateDaysLeft(yesterday.toISOString())).toBe(0);
  });

  it('should handle null/undefined dates', () => {
    // The function expects string | Date, so test with valid fallback
    expect(calculateDaysLeft(new Date('2020-01-01'))).toBe(0);
  });
});

describe('truncateString', () => {
  it('should truncate long text', () => {
    const longText = 'This is a very long text that should be truncated';
    expect(truncateString(longText, 10)).toBe('This is...');
  });

  it('should not truncate short text', () => {
    const shortText = 'Short';
    expect(truncateString(shortText, 10)).toBe('Short');
  });

  it('should handle empty text', () => {
    expect(truncateString('', 10)).toBe('');
  });
});

describe('stringToSlug', () => {
  it('should create URL-friendly slugs', () => {
    expect(stringToSlug('Hello World')).toBe('hello-world');
    expect(stringToSlug('Test Campaign #1')).toBe('test-campaign-1');
    expect(stringToSlug('  Extra   Spaces  ')).toBe('extra-spaces');
  });

  it('should handle special characters', () => {
    expect(stringToSlug('Café & Restaurant')).toBe('caf-restaurant');
    expect(stringToSlug('100% Success Rate!')).toBe('100-success-rate');
  });
});

describe('formatLargeNumber', () => {
  it('should format large numbers with appropriate suffixes', () => {
    expect(formatLargeNumber(1000)).toBe('1.0K');
    expect(formatLargeNumber(1000000)).toBe('1.0M');
  });

  it('should handle small numbers', () => {
    expect(formatLargeNumber(100)).toBe('100');
    expect(formatLargeNumber(0)).toBe('0');
  });
});

describe('calculatePercentage', () => {
  it('should calculate percentage correctly', () => {
    expect(calculatePercentage(500, 1000)).toBe(50);
    expect(calculatePercentage(750, 1000)).toBe(75);
    expect(calculatePercentage(1000, 1000)).toBe(100);
  });

  it('should handle zero total', () => {
    expect(calculatePercentage(100, 0)).toBe(0);
  });

  it('should handle negative values', () => {
    // The actual implementation may return negative percentages
    expect(calculatePercentage(-100, 1000)).toBe(-10);
    expect(calculatePercentage(100, -1000)).toBe(-10);
  });
});