-- Pizza Content Initial Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/hecsxlqeviirichoohkl/sql

-- Content types enum
CREATE TYPE content_type AS ENUM ('gif', 'meme', 'video');

-- Content status enum
CREATE TYPE content_status AS ENUM ('pending', 'approved', 'rejected', 'featured');

-- Request status enum
CREATE TYPE request_status AS ENUM ('open', 'in_progress', 'fulfilled', 'closed');

-- Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  is_pizzeria BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content items (unified table for gifs, memes, videos)
CREATE TABLE content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type content_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  source_url TEXT,
  source_platform TEXT,
  tags TEXT[] DEFAULT '{}',
  status content_status DEFAULT 'pending',
  is_viral BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0,
  submitted_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content requests
CREATE TABLE content_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type content_type,
  tags TEXT[] DEFAULT '{}',
  status request_status DEFAULT 'open',
  requested_by UUID REFERENCES profiles(id),
  fulfilled_by UUID REFERENCES content(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Favorites (user's saved content)
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, content_id)
);

-- View history
CREATE TABLE view_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_content_type ON content(type);
CREATE INDEX idx_content_status ON content(status);
CREATE INDEX idx_content_is_viral ON content(is_viral);
CREATE INDEX idx_content_tags ON content USING GIN(tags);
CREATE INDEX idx_favorites_user ON favorites(user_id);
CREATE INDEX idx_view_history_user ON view_history(user_id);
CREATE INDEX idx_requests_status ON content_requests(status);
