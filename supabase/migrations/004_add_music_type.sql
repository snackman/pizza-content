-- Add 'music' to content_type enum
ALTER TYPE content_type ADD VALUE IF NOT EXISTS 'music';

-- Add music-specific fields to content table
ALTER TABLE content ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
ALTER TABLE content ADD COLUMN IF NOT EXISTS artist TEXT;
ALTER TABLE content ADD COLUMN IF NOT EXISTS album TEXT;
