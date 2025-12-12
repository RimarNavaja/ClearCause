-- Fix transparency_score type in charities table
-- It was incorrectly set to DECIMAL(3,2) in some environments, causing overflow for scores > 9.99
-- It should be INTEGER (0-100)

ALTER TABLE public.charities 
ALTER COLUMN transparency_score TYPE INTEGER 
USING transparency_score::INTEGER;
