-- Insert dummy donation for testing refund (V10)
INSERT INTO donations (
  id,
  user_id,
  campaign_id,
  amount,
  status,
  payment_method,
  transaction_id,
  donated_at,
  updated_at
) VALUES (
  'd4100d42-0000-4100-8000-000000004110', -- NEW ID (V10)
  '0508a8fe-e5c5-4b79-b818-ba497c815563',
  '2f2145ef-2043-461d-80e9-44f43aa320db',
  4100.00,
  'completed',
  'card',
  'TEST_REFUND_4100_10_USER2', -- NEW Transaction ID
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Insert refund decision for V10
INSERT INTO donor_refund_decisions (
  refund_request_id,
  donor_id,
  donation_id,
  milestone_id,
  refund_amount,
  status
) VALUES (
  '2e0aaa62-72a8-4c89-8ac9-5a09fb127746',
  '0508a8fe-e5c5-4b79-b818-ba497c815563',
  'd4100d42-0000-4100-8000-000000004110', -- Linking to V10
  NULL,
  4100.00,
  'pending'
);