/**
 * Fee calculation utilities for donation flow
 * Implements "Donor Covers Fees" checkbox model
 * Matches backend calculation in create-gcash-payment Edge Function
 */

// Make configurable values dynamic
let DYNAMIC_PLATFORM_FEE_RATE = 0.05; // Default 5%
let DYNAMIC_MIN_DONATION = 100;       // Default ₱100

// Payment Gateway Fee (PayMongo/GCash) - Estimated at 2.5%
// This is added by the gateway on top of the amount we request if they are configured to pass fees to customer
// OR deducted from the total if we charge the gross amount.
// Based on observed behavior: 1030 requested -> 1056.41 charged.
// 1030 / (1 - X) = 1056.41 => 1 - X = 0.975 => X = 0.025 (2.5%)
const GATEWAY_FEE_RATE = 0.025;

export const FEE_CONSTANTS = {
  PLATFORM_FEE_RATE: DYNAMIC_PLATFORM_FEE_RATE, // Will be updated by context
  MIN_DONATION: DYNAMIC_MIN_DONATION,  // Will be updated by context
  MIN_NET_AMOUNT: 50,           // ₱50 minimum to charity
  GCASH_LIMIT: 100000,          // ₱100,000 GCash limit
  GATEWAY_FEE_RATE: GATEWAY_FEE_RATE
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
  gatewayFee?: number;        // Payment processor fee (PayMongo)
}

/**
 * Calculate fees when donor chooses to COVER fees
 * Donor pays extra so charity gets 100% of intended donation
 *
 * Example: ₱1,000 donation with 5% platform fee + 2.5% Gateway fee
 * - Platform fee: ₱50 (5% of 1000)
 * - Subtotal (Net to System): 1050
 * - Total Charge: 1050 / (1 - 0.025) = 1076.92
 * - Charity gets: ₱1,000
 */
export function calculateFeesWithDonorCovers(
  intendedDonation: number,
  tipAmount: number = 0,
  platformFeePercentage?: number
): FeeBreakdown {
  // Use provided percentage or fall back to global rate
  const feeRate = platformFeePercentage !== undefined
    ? platformFeePercentage / 100
    : DYNAMIC_PLATFORM_FEE_RATE;

  // Calculate platform fee using the fee rate
  const platformFee = Math.round(intendedDonation * feeRate * 100) / 100;

  // Amount we want to receive (Donation + Platform Fee + Tip)
  const amountToReceive = intendedDonation + platformFee + tipAmount;

  // Calculate total charge needed to cover gateway fees
  // Formula: AmountToReceive / (1 - GatewayRate)
  const totalCharge = amountToReceive / (1 - GATEWAY_FEE_RATE);
  
  // Gateway fee is the difference
  const gatewayFee = totalCharge - amountToReceive;

  return {
    grossAmount: intendedDonation,
    platformFee,
    tipAmount,
    netAmount: intendedDonation,  // Charity gets 100% of donation (tip goes to ClearCause!)
    totalCharge, // This will include the gateway fee (e.g. 1056.41)
    donorCoversFees: true,
    gatewayFee
  };
}

/**
 * Calculate fees when donor does NOT cover fees
 * Standard deduction model - platform fee deducted from donation
 *
 * Example: ₱1,000 donation with 5% platform fee
 * - Platform fee: ₱50 (5%)
 * - Gateway fee: ~2.5% of 1000 = 25
 * - Charity gets: 1000 - 50 - 25 = 925
 */
export function calculateFeesStandard(
  grossAmount: number,
  tipAmount: number = 0,
  platformFeePercentage?: number
): FeeBreakdown {
  // Use provided percentage or fall back to global rate
  const feeRate = platformFeePercentage !== undefined
    ? platformFeePercentage / 100
    : DYNAMIC_PLATFORM_FEE_RATE;

  const platformFee = Math.round(grossAmount * feeRate * 100) / 100;
  
  // Gateway fee is deducted from the gross amount
  const gatewayFee = grossAmount * GATEWAY_FEE_RATE;
  
  const totalCharge = grossAmount + tipAmount;
  
  // Charity gets donation minus (platform fee + gateway fee)
  const netAmount = grossAmount - platformFee - gatewayFee;

  return {
    grossAmount,
    platformFee,
    tipAmount,
    netAmount,
    totalCharge,
    donorCoversFees: false,
    gatewayFee
  };
}

/**
 * Main calculation function - routes to appropriate method based on coverFees flag
 *
 * @param amount - Donor's intended donation amount
 * @param tipAmount - Optional tip to ClearCause
 * @param donorCoversFees - If true, donor pays extra to cover fees (default: true)
 * @param platformFeePercentage - Optional platform fee percentage (e.g., 3 for 3%). If not provided, uses global setting.
 * @returns FeeBreakdown with all calculations
 */
export function calculateFees(
  amount: number,
  tipAmount: number = 0,
  donorCoversFees: boolean = true,
  platformFeePercentage?: number
): FeeBreakdown {
  if (donorCoversFees) {
    return calculateFeesWithDonorCovers(amount, tipAmount, platformFeePercentage);
  } else {
    return calculateFeesStandard(amount, tipAmount, platformFeePercentage);
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
 * @param platformFeePercentage - Optional platform fee percentage (e.g., 3 for 3%). If not provided, uses global setting.
 * @returns Validation result with error message if invalid
 */
export function validateDonationAmount(
  amount: number,
  tipAmount: number = 0,
  donorCoversFees: boolean = true,
  platformFeePercentage?: number
): { valid: boolean; error?: string } {
  if (amount < FEE_CONSTANTS.MIN_DONATION) {
    return { valid: false, error: `Minimum donation is ₱${FEE_CONSTANTS.MIN_DONATION}` };
  }

  const fees = calculateFees(amount, tipAmount, donorCoversFees, platformFeePercentage);

  if (fees.netAmount < FEE_CONSTANTS.MIN_NET_AMOUNT) {
    return { valid: false, error: `Charity must receive at least ₱${FEE_CONSTANTS.MIN_NET_AMOUNT} after fees` };
  }

  if (fees.totalCharge > FEE_CONSTANTS.GCASH_LIMIT) {
    return { valid: false, error: `Total charge exceeds GCash limit of ₱${FEE_CONSTANTS.GCASH_LIMIT.toLocaleString()}` };
  }

  return { valid: true };
}
