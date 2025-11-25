-- Create withdrawal_transactions table for direct withdrawal history
-- No approval workflow needed - transactions are completed immediately

CREATE TABLE withdrawal_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  charity_id UUID NOT NULL REFERENCES charities(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  bank_name TEXT NOT NULL,
  bank_account_last4 TEXT NOT NULL,
  transaction_reference TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed')),
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_withdrawal_transactions_charity_id ON withdrawal_transactions(charity_id);
CREATE INDEX idx_withdrawal_transactions_processed_at ON withdrawal_transactions(processed_at DESC);
CREATE INDEX idx_withdrawal_transactions_reference ON withdrawal_transactions(transaction_reference);

-- Add RLS policies
ALTER TABLE withdrawal_transactions ENABLE ROW LEVEL SECURITY;

-- Charities can view their own withdrawal history
CREATE POLICY "Charities can view own withdrawals"
  ON withdrawal_transactions
  FOR SELECT
  USING (
    charity_id IN (
      SELECT id FROM charities WHERE user_id = auth.uid()
    )
  );

-- Only the system (service role) can insert withdrawal transactions
CREATE POLICY "System can insert withdrawals"
  ON withdrawal_transactions
  FOR INSERT
  WITH CHECK (true);

-- Add helpful comments
COMMENT ON TABLE withdrawal_transactions IS 'Completed withdrawal transactions (no approval workflow)';
COMMENT ON COLUMN withdrawal_transactions.transaction_reference IS 'Auto-generated transaction reference (WTX-{timestamp}-{random})';
COMMENT ON COLUMN withdrawal_transactions.bank_account_last4 IS 'Last 4 digits of bank account for security';
COMMENT ON COLUMN withdrawal_transactions.status IS 'Transaction status (completed by default, failed if error occurs)';
