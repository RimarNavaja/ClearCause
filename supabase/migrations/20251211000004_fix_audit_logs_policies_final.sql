-- Fix Audit Logs Policies Final
-- Consolidate and clean up RLS policies for audit_logs to ensure reliable Admin access

-- 1. Drop all existing policies to ensure a clean slate
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_admin_access" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_own_view" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated users can insert their own audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_own_create" ON public.audit_logs;
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Service role full access" ON public.audit_logs;

-- 2. Enable RLS (just in case)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 3. Create Service Role Policy (Full Access)
CREATE POLICY "Service role full access"
  ON public.audit_logs FOR ALL
  USING (auth.role() = 'service_role');

-- 4. Create Admin View Policy
-- Allows admins to view ALL logs.
-- Checks both profiles table (primary source) OR auth metadata (backup)
CREATE POLICY "Admins can view all audit logs"
  ON public.audit_logs FOR SELECT
  USING (
    -- Check profiles table (standard app logic)
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    OR
    -- Check auth metadata (robust backup if profiles RLS fails)
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
    OR
    (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
  );

-- 5. Create User View Policy
-- Users can only view logs where they are the actor (user_id)
CREATE POLICY "Users can view their own audit logs"
  ON public.audit_logs FOR SELECT
  USING (auth.uid() = user_id);

-- 6. Create Insert Policy
-- Authenticated users can create logs for their own actions
CREATE POLICY "Authenticated users can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 7. Grant permissions
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
