-- Migration: Fix Webhook Trigger using supabase_functions
-- Date: 2025-12-13

-- Update Trigger Function to use supabase_functions.http_request
CREATE OR REPLACE FUNCTION public.trigger_send_email_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Call send-email Edge Function using supabase_functions
  PERFORM supabase_functions.http_request(
    'https://tepzdudbazbmydjugvwg.supabase.co/functions/v1/send-email',
    'POST',
    jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlcHpkdWRiYXpibXlkanVndndnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNjIyODAsImV4cCI6MjA3MzgzODI4MH0.bYdH7I-R5NPmScXITplOOIMUu3L5BkLSOzoUkld1rJg'
    ),
    jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', row_to_json(NEW),
      'old_record', null
    ),
    1000 -- Timeout in ms
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
