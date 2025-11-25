-- Drop withdrawal_requests table and related enum
-- This removes the withdrawal request/approval system since admin already approved milestones

-- Drop the table first
DROP TABLE IF EXISTS withdrawal_requests CASCADE;

-- Drop the enum type
DROP TYPE IF EXISTS withdrawal_status CASCADE;

-- Add comment explaining the change
COMMENT ON COLUMN charities.available_balance IS 'Current available funds that charity can withdraw (contact admin for manual withdrawal)';
COMMENT ON COLUMN charities.total_withdrawn IS 'Total funds withdrawn/transferred (manually tracked by admin)';
