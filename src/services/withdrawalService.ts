import { supabase } from '@/lib/supabase';
import { ApiResponse, ClearCauseError } from '@/lib/types';
import { withErrorHandling, createSuccessResponse, handleSupabaseError } from '@/utils/errors';
import { logAuditEvent } from './adminService';

export interface WithdrawalTransaction {
  id: string;
  charityId: string;
  amount: number;
  bankName: string;
  bankAccountLast4: string;
  transactionReference: string;
  status: 'completed' | 'failed';
  processedAt: string;
  notes?: string;
  createdAt: string;
}

/**
 * Generate a unique transaction reference
 */
function generateTransactionReference(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `WTX-${timestamp}-${random}`;
}

/**
 * Process a direct withdrawal (no admin approval needed)
 */
export const processWithdrawal = withErrorHandling(async (
  charityId: string,
  amount: number,
  bankDetails: {
    bankName: string;
    accountNumber: string;
  },
  currentUserId: string
): Promise<ApiResponse<WithdrawalTransaction>> => {
  // Verify the current user is associated with this charity
  const { data: charity, error: charityError } = await supabase
    .from('charities')
    .select('id, user_id, available_balance, total_withdrawn, organization_name')
    .eq('id', charityId)
    .single();

  if (charityError || !charity) {
    throw new ClearCauseError('NOT_FOUND', 'Charity not found', 404);
  }

  if (charity.user_id !== currentUserId) {
    throw new ClearCauseError('FORBIDDEN', 'You do not have permission to withdraw funds for this charity', 403);
  }

  // Check if charity has sufficient balance
  const availableBalance = parseFloat(charity.available_balance) || 0;
  if (amount > availableBalance) {
    throw new ClearCauseError(
      'BAD_REQUEST',
      `Insufficient balance. Available: ₱${availableBalance.toLocaleString()}, Requested: ₱${amount.toLocaleString()}`,
      400
    );
  }

  // Validate minimum withdrawal amount
  if (amount < 100) {
    throw new ClearCauseError('BAD_REQUEST', 'Minimum withdrawal amount is ₱100', 400);
  }

  // Generate transaction reference
  const transactionReference = generateTransactionReference();
  const bankAccountLast4 = bankDetails.accountNumber.slice(-4);

  try {
    // Start transaction: deduct balance and create withdrawal record
    // Update charity balance
    const { error: balanceUpdateError } = await supabase
      .from('charities')
      .update({
        available_balance: availableBalance - amount,
        total_withdrawn: (parseFloat(charity.total_withdrawn) || 0) + amount,
      })
      .eq('id', charityId);

    if (balanceUpdateError) {
      throw handleSupabaseError(balanceUpdateError);
    }

    // Create withdrawal transaction record
    const { data: transaction, error: transactionError } = await supabase
      .from('withdrawal_transactions')
      .insert({
        charity_id: charityId,
        amount,
        bank_name: bankDetails.bankName,
        bank_account_last4: bankAccountLast4,
        transaction_reference: transactionReference,
        status: 'completed',
      })
      .select()
      .single();

    if (transactionError) {
      // Rollback: restore balance if transaction record creation fails
      await supabase
        .from('charities')
        .update({
          available_balance: availableBalance,
          total_withdrawn: (parseFloat(charity.total_withdrawn) || 0),
        })
        .eq('id', charityId);

      throw handleSupabaseError(transactionError);
    }

    // Send notification to charity (optional)
    try {
      const { createNotification } = await import('./notificationService');
      await createNotification({
        userId: charity.user_id,
        type: 'system_announcement',
        title: 'Withdrawal Processed',
        message: `Your withdrawal of ₱${amount.toLocaleString()} has been processed successfully. Transaction reference: ${transactionReference}`,
        actionUrl: '/charity/funds',
        metadata: {
          withdrawal_id: transaction.id,
          amount,
          transaction_reference: transactionReference,
        },
      });
    } catch (notificationError) {
      console.error('Failed to send withdrawal notification:', notificationError);
    }

    // Log audit event for financial integrity
    await logAuditEvent(currentUserId, 'WITHDRAWAL_PROCESSED', 'withdrawal_transaction', transaction.id, {
      charity_id: charityId,
      amount,
      bank_name: bankDetails.bankName,
      transaction_reference: transactionReference,
      status: 'completed'
    });

    return createSuccessResponse({
      id: transaction.id,
      charityId: transaction.charity_id,
      amount: parseFloat(transaction.amount),
      bankName: transaction.bank_name,
      bankAccountLast4: transaction.bank_account_last4,
      transactionReference: transaction.transaction_reference,
      status: transaction.status as 'completed' | 'failed',
      processedAt: transaction.processed_at,
      notes: transaction.notes,
      createdAt: transaction.created_at,
    });
  } catch (error) {
    console.error('Withdrawal processing error:', error);
    throw error;
  }
});

/**
 * Get withdrawal history for a charity
 */
export const getWithdrawalHistory = withErrorHandling(async (
  charityId: string,
  currentUserId: string
): Promise<ApiResponse<WithdrawalTransaction[]>> => {
  // Verify the current user is associated with this charity
  const { data: charity, error: charityError } = await supabase
    .from('charities')
    .select('user_id')
    .eq('id', charityId)
    .single();

  if (charityError || !charity) {
    throw new ClearCauseError('NOT_FOUND', 'Charity not found', 404);
  }

  if (charity.user_id !== currentUserId) {
    throw new ClearCauseError('FORBIDDEN', 'You do not have permission to view withdrawal history for this charity', 403);
  }

  const { data: transactions, error } = await supabase
    .from('withdrawal_transactions')
    .select('*')
    .eq('charity_id', charityId)
    .order('processed_at', { ascending: false });

  if (error) {
    throw handleSupabaseError(error);
  }

  const withdrawalTransactions: WithdrawalTransaction[] = (transactions || []).map(t => ({
    id: t.id,
    charityId: t.charity_id,
    amount: parseFloat(t.amount),
    bankName: t.bank_name,
    bankAccountLast4: t.bank_account_last4,
    transactionReference: t.transaction_reference,
    status: t.status as 'completed' | 'failed',
    processedAt: t.processed_at,
    notes: t.notes,
    createdAt: t.created_at,
  }));

  return createSuccessResponse(withdrawalTransactions);
});
