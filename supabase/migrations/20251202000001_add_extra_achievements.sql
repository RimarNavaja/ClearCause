-- Add new achievements for donors
INSERT INTO public.achievements (name, slug, description, category, criteria, display_order)
VALUES 
  (
    'Sapphire Visionary', 
    'sapphire-visionary', 
    'Reach a total donation amount of ₱500,000+', 
    'donation_milestones', 
    '{"type": "total_donated", "amount": 500000}', 
    7
  ),
  (
    'Eternal Legend', 
    'eternal-legend', 
    'Reach a total donation amount of ₱1,000,000+', 
    'donation_milestones', 
    '{"type": "total_donated", "amount": 1000000}', 
    8
  )
ON CONFLICT (slug) DO NOTHING;


