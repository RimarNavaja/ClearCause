-- Clean up previous pending decisions for this donor to avoid clutter
DELETE FROM donor_refund_decisions
WHERE donor_id = '0508a8fe-e5c5-4b79-b818-ba497c815563' AND status = 'pending';

-- Insert dummy donation for testing refund (V8) for donor 0508a8fe-e5c5-4b79-b818-ba497c815563
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
  'd4100d42-0000-4100-8000-000000004108', -- New unique donation ID
  '0508a8fe-e5c5-4b79-b818-ba497c815563',
  '2f2145ef-2043-461d-80e9-44f43aa320db', -- Example campaign ID, adjust if needed
  4100.00,
  'completed',
  'card',
  'TEST_REFUND_4100_8_USER2', -- New unique transaction ID
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Insert refund decision for V8
INSERT INTO donor_refund_decisions (
  refund_request_id,
  donor_id,
  donation_id,
  refund_amount,
  status
) VALUES (
  '2e0aaa62-72a8-4c89-8ac9-5a09fb127746', -- Using the existing refund request ID
  '0508a8fe-e5c5-4b79-b818-ba497c815563',
  'd4100d42-0000-4100-8000-000000004108',
  4100.00,
  'pending'
);