-- Migration: Auto-complete campaigns when goal reached and milestones verified

-- 1. Create the check function
CREATE OR REPLACE FUNCTION public.check_and_complete_campaign(p_campaign_id UUID)
RETURNS VOID AS $$
DECLARE
  v_current_amount NUMERIC;
  v_goal_amount NUMERIC;
  v_campaign_status campaign_status;
  v_unverified_milestones_count INTEGER;
BEGIN
  -- Get campaign details
  SELECT current_amount, goal_amount, status
  INTO v_current_amount, v_goal_amount, v_campaign_status
  FROM campaigns
  WHERE id = p_campaign_id;

  -- Only proceed if campaign is currently active
  IF v_campaign_status != 'active' THEN
    RETURN;
  END IF;

  -- Check 1: Funding Goal Reached
  IF v_current_amount < v_goal_amount THEN
    RETURN; -- Goal not reached yet
  END IF;

  -- Check 2: All Milestones Verified
  -- We count milestones that are NOT verified
  SELECT COUNT(*)
  INTO v_unverified_milestones_count
  FROM milestones
  WHERE campaign_id = p_campaign_id
  AND status != 'verified';

  IF v_unverified_milestones_count > 0 THEN
    RETURN; -- There are still unverified milestones
  END IF;

  -- If we get here, conditions are met!
  UPDATE campaigns
  SET 
    status = 'completed',
    updated_at = NOW()
  WHERE id = p_campaign_id;
  
  -- Log logic (optional, but good for debugging)
  RAISE NOTICE 'Auto-completed campaign %', p_campaign_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger Function for Campaign Updates
CREATE OR REPLACE FUNCTION public.trigger_check_complete_on_campaign_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if amount changed and is >= goal
  IF NEW.current_amount >= NEW.goal_amount THEN
    PERFORM public.check_and_complete_campaign(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger Function for Milestone Updates
CREATE OR REPLACE FUNCTION public.trigger_check_complete_on_milestone_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check if status changed to 'verified'
  IF NEW.status = 'verified' AND OLD.status != 'verified' THEN
    PERFORM public.check_and_complete_campaign(NEW.campaign_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create Triggers
DROP TRIGGER IF EXISTS check_completion_on_campaign_amount ON campaigns;
CREATE TRIGGER check_completion_on_campaign_amount
  AFTER UPDATE OF current_amount ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_check_complete_on_campaign_update();

DROP TRIGGER IF EXISTS check_completion_on_milestone_verify ON milestones;
CREATE TRIGGER check_completion_on_milestone_verify
  AFTER UPDATE OF status ON milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_check_complete_on_milestone_update();
