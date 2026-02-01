-- Migration: 005_import_sources
-- Description: Add tables for tracking import sources and import logs

-- Track import sources
CREATE TABLE IF NOT EXISTS import_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  source_identifier TEXT NOT NULL,
  display_name TEXT,
  last_fetched_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform, source_identifier)
);

-- Track import jobs
CREATE TABLE IF NOT EXISTS import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES import_sources(id),
  status TEXT NOT NULL, -- 'running', 'completed', 'failed'
  items_found INTEGER DEFAULT 0,
  items_imported INTEGER DEFAULT 0,
  items_skipped INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_import_sources_platform ON import_sources(platform);
CREATE INDEX IF NOT EXISTS idx_import_sources_active ON import_sources(is_active);
CREATE INDEX IF NOT EXISTS idx_import_logs_source ON import_logs(source_id);
CREATE INDEX IF NOT EXISTS idx_import_logs_status ON import_logs(status);

-- Prevent duplicate imports via source_url (only if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_content_source_url'
  ) THEN
    CREATE UNIQUE INDEX idx_content_source_url ON content(source_url) WHERE source_url IS NOT NULL;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE import_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;

-- Allow public read access to import_sources and import_logs
CREATE POLICY "Allow public read access to import_sources" ON import_sources
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access to import_logs" ON import_logs
  FOR SELECT USING (true);

-- Allow service role full access
CREATE POLICY "Allow service role full access to import_sources" ON import_sources
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to import_logs" ON import_logs
  FOR ALL USING (auth.role() = 'service_role');
