-- Add creator column to content table
-- This migration was applied manually; this file is for documentation purposes.

ALTER TABLE content ADD COLUMN IF NOT EXISTS creator TEXT;
CREATE INDEX IF NOT EXISTS idx_content_creator ON content(creator);
