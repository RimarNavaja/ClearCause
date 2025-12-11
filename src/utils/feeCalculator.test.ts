/**
 * Fee Calculator Tests
 * Tests for platform fee calculation with dynamic rates
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateFees,
  calculateFeesWithDonorCovers,
  calculateFeesStandard,
  setPlatformFeeRate,
  getPlatformFeePercentage,
  setMinimumDonation,
  getMinimumDonation,
  getSuggestedTips,
  validateDonationAmount,
  FEE_CONSTANTS
} from './feeCalculator';

describe('Fee Calculator', () => {
  beforeEach(() => {
    // Reset to default values before each test
    setPlatformFeeRate(5); // 5%
    setMinimumDonation(100);
  });

  describe('setPlatformFeeRate and getPlatformFeePercentage', () => {
    it('should set and get platform fee rate correctly', () => {
      setPlatformFeeRate(5);
      expect(getPlatformFeePercentage()).toBe(5);

      setPlatformFeeRate(10);
      expect(getPlatformFeePercentage()).toBe(10);

      setPlatformFeeRate(2.5);
      expect(getPlatformFeePercentage()).toBe(2.5);
    });

    it('should convert percentage to decimal rate internally', () => {
      setPlatformFeeRate(5);
      expect(FEE_CONSTANTS.PLATFORM_FEE_RATE).toBe(0.05);

      setPlatformFeeRate(10);
      expect(FEE_CONSTANTS.PLATFORM_FEE_RATE).toBe(0.10);

      setPlatformFeeRate(15.75);
      expect(FEE_CONSTANTS.PLATFORM_FEE_RATE).toBe(0.1575);
    });
  });

  describe('setMinimumDonation and getMinimumDonation', () => {
    it('should set and get minimum donation correctly', () => {
      setMinimumDonation(100);
      expect(getMinimumDonation()).toBe(100);

      setMinimumDonation(500);
      expect(getMinimumDonation()).toBe(500);
    });
  });

  describe('calculateFeesWithDonorCovers (donor covers fees)', () => {
    it('should calculate correctly with 5% platform fee', () => {
      setPlatformFeeRate(5);
      const result = calculateFeesWithDonorCovers(1000, 0);

      expect(result).toEqual({
        grossAmount: 1000,
        platformFee: 50,
        tipAmount: 0,
        netAmount: 1000,
        totalCharge: 1050,
        donorCoversFees: true
      });
    });

    it('should calculate correctly with 10% platform fee', () => {
      setPlatformFeeRate(10);
      const result = calculateFeesWithDonorCovers(1000, 0);

      expect(result).toEqual({
        grossAmount: 1000,
        platformFee: 100,
        tipAmount: 0,
        netAmount: 1000,
        totalCharge: 1100,
        donorCoversFees: true
      });
    });

    it('should calculate correctly with 15.75% platform fee', () => {
      setPlatformFeeRate(15.75);
      const result = calculateFeesWithDonorCovers(1000, 0);

      expect(result).toEqual({
        grossAmount: 1000,
        platformFee: 157.5,
        tipAmount: 0,
        netAmount: 1000,
        totalCharge: 1157.5,
        donorCoversFees: true
      });
    });

    it('should include tip in total charge', () => {
      setPlatformFeeRate(5);
      const result = calculateFeesWithDonorCovers(1000, 50);

      expect(result).toEqual({
        grossAmount: 1000,
        platformFee: 50,
        tipAmount: 50,
        netAmount: 1000,
        totalCharge: 1100,
        donorCoversFees: true
      });
    });

    it('should calculate correctly with 0.5% platform fee', () => {
      setPlatformFeeRate(0.5);
      const result = calculateFeesWithDonorCovers(1000, 0);

      expect(result).toEqual({
        grossAmount: 1000,
        platformFee: 5,
        tipAmount: 0,
        netAmount: 1000,
        totalCharge: 1005,
        donorCoversFees: true
      });
    });

    it('should round platform fee to 2 decimal places', () => {
      setPlatformFeeRate(5);
      const result = calculateFeesWithDonorCovers(333.33, 0);

      expect(result.platformFee).toBe(16.67);
      expect(result.totalCharge).toBe(350);
    });
  });

  describe('calculateFeesStandard (standard deduction)', () => {
    it('should calculate correctly with 5% platform fee', () => {
      setPlatformFeeRate(5);
      const result = calculateFeesStandard(1000, 0);

      expect(result).toEqual({
        grossAmount: 1000,
        platformFee: 50,
        tipAmount: 0,
        netAmount: 950,
        totalCharge: 1000,
        donorCoversFees: false
      });
    });

    it('should calculate correctly with 10% platform fee', () => {
      setPlatformFeeRate(10);
      const result = calculateFeesStandard(1000, 0);

      expect(result).toEqual({
        grossAmount: 1000,
        platformFee: 100,
        tipAmount: 0,
        netAmount: 900,
        totalCharge: 1000,
        donorCoversFees: false
      });
    });

    it('should calculate correctly with 15.75% platform fee', () => {
      setPlatformFeeRate(15.75);
      const result = calculateFeesStandard(1000, 0);

      expect(result).toEqual({
        grossAmount: 1000,
        platformFee: 157.5,
        tipAmount: 0,
        netAmount: 842.5,
        totalCharge: 1000,
        donorCoversFees: false
      });
    });

    it('should include tip in total charge but not deduct from charity', () => {
      setPlatformFeeRate(5);
      const result = calculateFeesStandard(1000, 50);

      expect(result).toEqual({
        grossAmount: 1000,
        platformFee: 50,
        tipAmount: 50,
        netAmount: 950,
        totalCharge: 1050,
        donorCoversFees: false
      });
    });
  });

  describe('calculateFees (main routing function)', () => {
    it('should route to donor covers when coverFees is true', () => {
      setPlatformFeeRate(5);
      const result = calculateFees(1000, 0, true);

      expect(result.donorCoversFees).toBe(true);
      expect(result.netAmount).toBe(1000);
      expect(result.totalCharge).toBe(1050);
    });

    it('should route to standard when coverFees is false', () => {
      setPlatformFeeRate(5);
      const result = calculateFees(1000, 0, false);

      expect(result.donorCoversFees).toBe(false);
      expect(result.netAmount).toBe(950);
      expect(result.totalCharge).toBe(1000);
    });

    it('should default to donor covers fees (true)', () => {
      setPlatformFeeRate(5);
      const result = calculateFees(1000, 0);

      expect(result.donorCoversFees).toBe(true);
    });
  });

  describe('getSuggestedTips', () => {
    it('should return correct tip suggestions', () => {
      const tips = getSuggestedTips(1000);

      expect(tips).toEqual([
        0,    // 0%
        50,   // 5%
        100,  // 10%
        150   // 15%
      ]);
    });

    it('should round tips to whole numbers', () => {
      const tips = getSuggestedTips(333);

      expect(tips).toEqual([
        0,   // 0%
        17,  // 5% rounded
        33,  // 10% rounded
        50   // 15% rounded
      ]);
    });
  });

  describe('validateDonationAmount', () => {
    beforeEach(() => {
      setPlatformFeeRate(5);
      setMinimumDonation(100);
    });

    it('should accept valid donation amounts', () => {
      const result = validateDonationAmount(1000, 0, true);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject donations below minimum', () => {
      const result = validateDonationAmount(50, 0, true);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Minimum donation is ₱100');
    });

    it('should reject donations where charity receives less than ₱50', () => {
      setMinimumDonation(10); // Lower minimum to test this edge case
      setPlatformFeeRate(50); // 50% fee

      const result = validateDonationAmount(50, 0, false);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Charity must receive at least ₱50');
    });

    it('should reject donations exceeding GCash limit', () => {
      const result = validateDonationAmount(100001, 0, true);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('GCash limit');
    });

    it('should validate with different platform fee rates', () => {
      setPlatformFeeRate(10);
      const result = validateDonationAmount(1000, 0, true);
      expect(result.valid).toBe(true);
    });

    it('should account for tips in validation', () => {
      const result = validateDonationAmount(1000, 99000, true);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('GCash limit');
    });
  });

  describe('Edge cases and rounding', () => {
    it('should handle very small amounts correctly', () => {
      setPlatformFeeRate(5);
      setMinimumDonation(10);
      const result = calculateFees(10, 0, true);

      expect(result.platformFee).toBe(0.5);
      expect(result.totalCharge).toBe(10.5);
      expect(result.netAmount).toBe(10);
    });

    it('should handle large amounts correctly', () => {
      setPlatformFeeRate(5);
      const result = calculateFees(99999, 0, true);

      // Note: Due to rounding, 99999 * 0.05 = 4999.95, not exactly 5000
      expect(result.platformFee).toBe(4999.95);
      expect(result.totalCharge).toBe(104998.95);
      expect(result.netAmount).toBe(99999);
    });

    it('should handle decimal donation amounts', () => {
      setPlatformFeeRate(5);
      const result = calculateFees(1234.56, 0, true);

      expect(result.platformFee).toBe(61.73);
      expect(result.totalCharge).toBe(1296.29);
      expect(result.netAmount).toBe(1234.56);
    });

    it('should handle 100% platform fee rate (edge case)', () => {
      setPlatformFeeRate(100);
      const result = calculateFeesStandard(1000, 0);

      expect(result.platformFee).toBe(1000);
      expect(result.netAmount).toBe(0);
      expect(result.totalCharge).toBe(1000);
    });

    it('should handle 0% platform fee rate', () => {
      setPlatformFeeRate(0);
      const result = calculateFees(1000, 0, true);

      expect(result.platformFee).toBe(0);
      expect(result.totalCharge).toBe(1000);
      expect(result.netAmount).toBe(1000);
    });
  });

  describe('Real-world scenarios from bug report', () => {
    it('should match UI display percentage with actual calculation (5%)', () => {
      setPlatformFeeRate(5);
      const displayPercentage = getPlatformFeePercentage();
      const calculation = calculateFees(1000, 0, true);

      // UI shows 5%
      expect(displayPercentage).toBe(5);
      // Calculation should use 5% (₱50 fee on ₱1000)
      expect(calculation.platformFee).toBe(50);
    });

    it('should match UI display percentage with actual calculation (10%)', () => {
      setPlatformFeeRate(10);
      const displayPercentage = getPlatformFeePercentage();
      const calculation = calculateFees(1000, 0, true);

      // UI shows 10%
      expect(displayPercentage).toBe(10);
      // Calculation should use 10% (₱100 fee on ₱1000)
      expect(calculation.platformFee).toBe(100);
    });

    it('should update calculations when platform fee changes', () => {
      // Initial 5% fee
      setPlatformFeeRate(5);
      let result = calculateFees(1000, 0, true);
      expect(result.platformFee).toBe(50);

      // Admin changes to 10%
      setPlatformFeeRate(10);
      result = calculateFees(1000, 0, true);
      expect(result.platformFee).toBe(100);

      // Admin changes to 15.75%
      setPlatformFeeRate(15.75);
      result = calculateFees(1000, 0, true);
      expect(result.platformFee).toBe(157.5);
    });
  });
});
