-- Add specific regulatory fields to the charity_verifications table
ALTER TABLE public.charity_verifications
ADD COLUMN IF NOT EXISTS sec_registration_number TEXT,
ADD COLUMN IF NOT EXISTS dswd_license_number TEXT,
ADD COLUMN IF NOT EXISTS dswd_license_expiry DATE,
ADD COLUMN IF NOT EXISTS pcnc_accreditation_number TEXT,
ADD COLUMN IF NOT EXISTS bir_registration_number TEXT,


-- Comment on columns for clarity
COMMENT ON COLUMN public.charity_verifications.sec_registration_number IS 'SEC Certificate of Incorporation Number';
COMMENT ON COLUMN public.charity_verifications.dswd_license_number IS 'DSWD License to Operate Number';
COMMENT ON COLUMN public.charity_verifications.dswd_license_expiry IS 'Expiration date of the DSWD License';
