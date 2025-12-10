/**
 * Fee calculation utilities for donation flow
 * Implements "Donor Covers Fees" checkbox model
 * Matches backend calculation in create-gcash-payment Edge Function
 */

// Make configurable values dynamic
let DYNAMIC_PLATFORM_FEE_RATE = 0.05; // Default 5%
let DYNAMIC_MIN_DONATION = 100;       // Default ₱100

export const FEE_CONSTANTS = {
  PLATFORM_FEE_RATE: DYNAMIC_PLATFORM_FEE_RATE, // Will be updated by context
  MIN_DONATION: DYNAMIC_MIN_DONATION,  // Will be updated by context
  MIN_NET_AMOUNT: 50,           // ₱50 minimum to charity
  GCASH_LIMIT: 100000           // ₱100,000 GCash limit
} as const;

/**
 * Update platform fee rate from admin settings
 * @param percentage - Platform fee percentage (e.g., 5 for 5%)
 */
export function setPlatformFeeRate(percentage: number): void {
  DYNAMIC_PLATFORM_FEE_RATE = percentage / 100; // Convert 5 -> 0.05
  // Update the constant (note: this mutates the object but maintains reference)
  (FEE_CONSTANTS as any).PLATFORM_FEE_RATE = DYNAMIC_PLATFORM_FEE_RATE;
}

/**
 * Get current platform fee percentage
 * @returns Platform fee percentage (e.g., 5 for 5%)
 */
export function getPlatformFeePercentage(): number {
  return DYNAMIC_PLATFORM_FEE_RATE * 100;
}

/**
 * Update minimum donation amount from admin settings
 * @param amount - Minimum donation amount (e.g., 100 for ₱100)
 */
export function setMinimumDonation(amount: number): void {
  DYNAMIC_MIN_DONATION = amount;
  (FEE_CONSTANTS as any).MIN_DONATION = DYNAMIC_MIN_DONATION;
}

/**
 * Get current minimum donation amount
 * @returns Minimum donation amount (e.g., 100 for ₱100)
 */
export function getMinimumDonation(): number {
  return DYNAMIC_MIN_DONATION;
}

export interface FeeBreakdown {
  grossAmount: number;        // Donor's intended donation
  platformFee: number;        // Platform fee (admin configurable %)
  tipAmount: number;          // Optional tip
  netAmount: number;          // Charity receives
  totalCharge: number;        // Donor pays
  donorCoversFees: boolean;   // Whether donor is covering fees
}

/**
 * Calculate fees when donor chooses to COVER fees
 * Donor pays extra so charity gets 100% of intended donation
 *
 * Example: ₱1,000 donation with 5% platform fee
 * - Platform fee: ₱50 (5%)
 * - Total charge: ₱1,050
 * - Charity gets: ₱1,000 (100%!)
 */
export function calculateFeesWithDonorCovers(
  intendedDonation: number,
  tipAmount: number = 0
): FeeBreakdown {
  // Calculate platform fee using dynamic rate
  const platformFee = Math.round(intendedDonation * DYNAMIC_PLATFORM_FEE_RATE * 100) / 100;

  // Donor covers fees: total charge = donation + platform fee + tip
  const totalCharge = intendedDonation + platformFee + tipAmount;

  return {
    grossAmount: intendedDonation,
    platformFee,
    tipAmount,
    netAmount: intendedDonation,  // Charity gets 100% of donation (tip goes to ClearCause!)
    totalCharge,
    donorCoversFees: true
  };
}

/**
 * Calculate fees when donor does NOT cover fees
 * Standard deduction model - platform fee deducted from donation
 *
 * Example: ₱1,000 donation with 5% platform fee
 * - Platform fee: ₱50 (5%)
 * - Charity gets: ₱950 (95%)
 */
export function calculateFeesStandard(
  grossAmount: number,
  tipAmount: number = 0
): FeeBreakdown {
  const platformFee = Math.round(grossAmount * DYNAMIC_PLATFORM_FEE_RATE * 100) / 100;
  const totalCharge = grossAmount + tipAmount;
  const netAmount = grossAmount - platformFee;  // Charity gets donation minus platform fee (tip goes to ClearCause!)

  return {
    grossAmount,
    platformFee,
    tipAmount,
    netAmount,
    totalCharge,
    donorCoversFees: false
  };
}

/**
 * Main calculation function - routes to appropriate method based on coverFees flag
 *
 * @param amount - Donor's intended donation amount
 * @param tipAmount - Optional tip to ClearCause
 * @param donorCoversFees - If true, donor pays extra to cover fees (default: true)
 * @returns FeeBreakdown with all calculations
 */
export function calculateFees(
  amount: number,
  tipAmount: number = 0,
  donorCoversFees: boolean = true
): FeeBreakdown {
  if (donorCoversFees) {
    return calculateFeesWithDonorCovers(amount, tipAmount);
  } else {
    return calculateFeesStandard(amount, tipAmount);
  }
}

/**
 * Get suggested tip amounts based on donation
 * @param amount - Donation amount
 * @returns Array of [0%, 5%, 10%, 15%] tip amounts
 */
export function getSuggestedTips(amount: number): number[] {
  return [
    0,
    Math.round(amount * 0.05),  // 5%
    Math.round(amount * 0.10),  // 10%
    Math.round(amount * 0.15)   // 15%
  ];
}

/**
 * Validate donation amount with fee calculations
 * @param amount - Donation amount
 * @param tipAmount - Optional tip
 * @param donorCoversFees - Whether donor is covering fees
 * @returns Validation result with error message if invalid
 */
export function validateDonationAmount(
  amount: number,
  tipAmount: number = 0,
  donorCoversFees: boolean = true
): { valid: boolean; error?: string } {
  if (amount < FEE_CONSTANTS.MIN_DONATION) {
    return { valid: false, error: `Minimum donation is ₱${FEE_CONSTANTS.MIN_DONATION}` };
  }

  const fees = calculateFees(amount, tipAmount, donorCoversFees);

  if (fees.netAmount < FEE_CONSTANTS.MIN_NET_AMOUNT) {
    return { valid: false, error: `Charity must receive at least ₱${FEE_CONSTANTS.MIN_NET_AMOUNT} after fees` };
  }

  if (fees.totalCharge > FEE_CONSTANTS.GCASH_LIMIT) {
    return { valid: false, error: `Total charge exceeds GCash limit of ₱${FEE_CONSTANTS.GCASH_LIMIT.toLocaleString()}` };
  }

  return { valid: true };
}
