-- Pizza Content: Content Requests Bounty Feature
-- Migration: 004_content_requests_bounty.sql
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/hecsxlqeviirichoohkl/sql

-- Add bounty fields to content_requests
ALTER TABLE content_requests
  ADD COLUMN IF NOT EXISTS bounty_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bounty_currency TEXT DEFAULT 'USDC',
  ADD COLUMN IF NOT EXISTS claimed_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';

-- Add request_id to content for linking fulfilled content
ALTER TABLE content
  ADD COLUMN IF NOT EXISTS fulfills_request_id UUID REFERENCES content_requests(id);

-- Request claims (who is working on a request)
CREATE TABLE IF NOT EXISTS request_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES content_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  status TEXT DEFAULT 'active' NOT NULL, -- 'active', 'completed', 'abandoned', 'expired'
  UNIQUE(request_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_requests_bounty ON content_requests(bounty_amount DESC);
CREATE INDEX IF NOT EXISTS idx_requests_deadline ON content_requests(deadline);
CREATE INDEX IF NOT EXISTS idx_content_fulfills_request ON content(fulfills_request_id);
CREATE INDEX IF NOT EXISTS idx_request_claims_request ON request_claims(request_id);
CREATE INDEX IF NOT EXISTS idx_request_claims_user ON request_claims(user_id);

-- RLS for claims
ALTER TABLE request_claims ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist, then create
DROP POLICY IF EXISTS "Claims are viewable by everyone" ON request_claims;
CREATE POLICY "Claims are viewable by everyone" ON request_claims
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create own claims" ON request_claims;
CREATE POLICY "Users can create own claims" ON request_claims
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own claims" ON request_claims;
CREATE POLICY "Users can update own claims" ON request_claims
  FOR UPDATE USING (auth.uid() = user_id);
