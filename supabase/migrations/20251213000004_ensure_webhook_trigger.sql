-- Migration: Ensure Webhook Trigger for Email Notifications
-- Date: 2025-12-13

-- Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create or Replace Trigger Function
CREATE OR REPLACE FUNCTION public.trigger_send_email_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Call send-email Edge Function using supabase_functions.http_request
  -- This requires the supabase_functions schema/extension to be available
  -- If not available, it might fail. Fallback to pg_net logic could be added but 
  -- usually supabase_functions is standard in newer Supabase versions.
  
  -- Note: The URL and Key should ideally be dynamic or secrets, but in SQL triggers 
  -- we often hardcode them or look them up from a secrets table if designed that way.
  -- Here we use the values observed in previous migration files.
  
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
    5000 -- Timeout in ms (increased to 5s)
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the transaction
  RAISE WARNING 'Failed to trigger email notification: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create Trigger
DROP TRIGGER IF EXISTS send_email_notification_trigger ON public.notifications;

CREATE TRIGGER send_email_notification_trigger
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.trigger_send_email_notification();
