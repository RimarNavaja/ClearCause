-- Fix Audit Logs RLS Policies
-- Add admin access policies to allow viewing all audit logs for Activity Log feature
-- This enables the Audit Trail functionality as per system requirements

-- ============================================================================
-- 1. DROP EXISTING RESTRICTIVE POLICIES (if they conflict)
-- ============================================================================

-- Note: We keep the existing "Users can view their own audit logs" policy
-- and "System can insert audit logs" policy, but add admin access

-- ============================================================================
-- 2. ADD ADMIN READ ACCESS POLICY
-- ============================================================================

-- Allow admins to view ALL audit logs (for Activity Log dashboard)
CREATE POLICY "Admins can view all audit logs"
  ON public.audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- 3. ENSURE SERVICE ROLE CAN INSERT AUDIT LOGS
-- ============================================================================

-- Check if service role insert policy exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'audit_logs' 
    AND policyname = 'Service role can insert audit logs'
  ) THEN
    EXECUTE 'CREATE POLICY "Service role can insert audit logs" 
      ON public.audit_logs FOR INSERT 
      WITH CHECK (auth.role() = ''service_role'')';
  END IF;
END $$;

-- ============================================================================
-- 4. ALLOW AUTHENTICATED USERS TO INSERT THEIR OWN AUDIT LOGS
-- ============================================================================

-- This allows the application to log user actions via the logAuditEvent function
CREATE POLICY "Authenticated users can insert their own audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 5. GRANT PERMISSIONS
-- ============================================================================

-- Ensure authenticated users can insert and select their own records
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

-- ============================================================================
-- 6. ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON POLICY "Admins can view all audit logs" ON public.audit_logs IS 
  'Allows admin users to view all audit logs for the Activity Log dashboard feature';

COMMENT ON POLICY "Authenticated users can insert their own audit logs" ON public.audit_logs IS 
  'Allows authenticated users to insert audit log entries for their own actions';
