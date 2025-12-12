-- Migration: Fix Webhook Trigger Schema (net.http_post)
-- Date: 2025-12-13

-- Ensure pg_net is enabled
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA net;

-- Create Trigger Function
CREATE OR REPLACE FUNCTION public.trigger_send_email_notification()
RETURNS TRIGGER AS $$
DECLARE
  request_id BIGINT;
BEGIN
  -- Call send-email Edge Function using net.http_post
  -- URL matches your project: https://tepzdudbazbmydjugvwg.supabase.co
  
  SELECT net.http_post(
    url := 'https://tepzdudbazbmydjugvwg.supabase.co/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlcHpkdWRiYXpibXlkanVndndnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNjIyODAsImV4cCI6MjA3MzgzODI4MH0.bYdH7I-R5NPmScXITplOOIMUu3L5BkLSOzoUkld1rJg'
    ),
    body := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', row_to_json(NEW),
      'old_record', null
    )
  ) INTO request_id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to trigger email notification via net.http_post: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create Trigger
DROP TRIGGER IF EXISTS send_email_notification_trigger ON public.notifications;

CREATE TRIGGER send_email_notification_trigger
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.trigger_send_email_notification();
