-- Add pizzeria-specific fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_address TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'US';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;

-- Index for verified pizzerias
CREATE INDEX IF NOT EXISTS idx_profiles_verified_pizzerias
  ON profiles(is_pizzeria, is_verified)
  WHERE is_pizzeria = TRUE;
