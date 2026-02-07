-- 1. Create content_votes table
CREATE TABLE content_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(content_id, user_id)
);

CREATE INDEX idx_content_votes_content ON content_votes(content_id);
CREATE INDEX idx_content_votes_user ON content_votes(user_id);

-- 2. Create all_star_votes table
CREATE TABLE all_star_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  all_star_id UUID NOT NULL REFERENCES pizza_all_stars(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(all_star_id, user_id)
);

CREATE INDEX idx_all_star_votes_all_star ON all_star_votes(all_star_id);
CREATE INDEX idx_all_star_votes_user ON all_star_votes(user_id);

-- 3. Enable RLS
ALTER TABLE content_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE all_star_votes ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view their own votes
CREATE POLICY "Users can view own content votes" ON content_votes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own content votes" ON content_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own content votes" ON content_votes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own content votes" ON content_votes FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own all star votes" ON all_star_votes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own all star votes" ON all_star_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own all star votes" ON all_star_votes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own all star votes" ON all_star_votes FOR DELETE USING (auth.uid() = user_id);

-- 4. Reset existing anonymous vote counters (preserve flagged content status!)
UPDATE content SET upvotes = 0, downvotes = 0;
UPDATE pizza_all_stars SET upvotes = 0, downvotes = 0;

-- 5. Drop existing functions with old signatures
DROP FUNCTION IF EXISTS vote_content(UUID, TEXT);
DROP FUNCTION IF EXISTS vote_all_star(UUID, TEXT);
DROP FUNCTION IF EXISTS flag_content(UUID);

-- 6. Replace vote_content function (requires auth, toggle/switch, recount)
CREATE FUNCTION vote_content(p_content_id UUID, p_vote_type TEXT)
RETURNS TABLE(upvotes INTEGER, downvotes INTEGER, user_vote TEXT) AS $$
DECLARE
  v_user_id UUID;
  v_existing_vote TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_vote_type NOT IN ('up', 'down') THEN
    RAISE EXCEPTION 'Invalid vote type. Must be "up" or "down".';
  END IF;

  SELECT cv.vote_type INTO v_existing_vote
  FROM content_votes cv
  WHERE cv.content_id = p_content_id AND cv.user_id = v_user_id;

  IF v_existing_vote IS NOT NULL THEN
    IF v_existing_vote = p_vote_type THEN
      DELETE FROM content_votes cv WHERE cv.content_id = p_content_id AND cv.user_id = v_user_id;
    ELSE
      UPDATE content_votes cv SET vote_type = p_vote_type WHERE cv.content_id = p_content_id AND cv.user_id = v_user_id;
    END IF;
  ELSE
    INSERT INTO content_votes (content_id, user_id, vote_type) VALUES (p_content_id, v_user_id, p_vote_type);
  END IF;

  UPDATE content c SET
    upvotes = (SELECT COUNT(*) FROM content_votes cv2 WHERE cv2.content_id = p_content_id AND cv2.vote_type = 'up'),
    downvotes = (SELECT COUNT(*) FROM content_votes cv2 WHERE cv2.content_id = p_content_id AND cv2.vote_type = 'down')
  WHERE c.id = p_content_id;

  RETURN QUERY
  SELECT c.upvotes, c.downvotes,
    (SELECT cv3.vote_type FROM content_votes cv3 WHERE cv3.content_id = p_content_id AND cv3.user_id = v_user_id) AS user_vote
  FROM content c WHERE c.id = p_content_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Replace vote_all_star function
CREATE FUNCTION vote_all_star(p_all_star_id UUID, p_vote_type TEXT)
RETURNS TABLE(upvotes INTEGER, downvotes INTEGER, user_vote TEXT) AS $$
DECLARE
  v_user_id UUID;
  v_existing_vote TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_vote_type NOT IN ('up', 'down') THEN
    RAISE EXCEPTION 'Invalid vote type.';
  END IF;

  SELECT av.vote_type INTO v_existing_vote
  FROM all_star_votes av
  WHERE av.all_star_id = p_all_star_id AND av.user_id = v_user_id;

  IF v_existing_vote IS NOT NULL THEN
    IF v_existing_vote = p_vote_type THEN
      DELETE FROM all_star_votes av WHERE av.all_star_id = p_all_star_id AND av.user_id = v_user_id;
    ELSE
      UPDATE all_star_votes av SET vote_type = p_vote_type WHERE av.all_star_id = p_all_star_id AND av.user_id = v_user_id;
    END IF;
  ELSE
    INSERT INTO all_star_votes (all_star_id, user_id, vote_type) VALUES (p_all_star_id, v_user_id, p_vote_type);
  END IF;

  UPDATE pizza_all_stars pas SET
    upvotes = (SELECT COUNT(*) FROM all_star_votes av2 WHERE av2.all_star_id = p_all_star_id AND av2.vote_type = 'up'),
    downvotes = (SELECT COUNT(*) FROM all_star_votes av2 WHERE av2.all_star_id = p_all_star_id AND av2.vote_type = 'down')
  WHERE pas.id = p_all_star_id;

  RETURN QUERY
  SELECT pas.upvotes, pas.downvotes,
    (SELECT av3.vote_type FROM all_star_votes av3 WHERE av3.all_star_id = p_all_star_id AND av3.user_id = v_user_id) AS user_vote
  FROM pizza_all_stars pas WHERE pas.id = p_all_star_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Update flag_content to require auth
CREATE FUNCTION flag_content(p_content_id UUID)
RETURNS TABLE(id UUID, status content_status) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE content
  SET status = 'flagged_not_pizza'::content_status
  WHERE content.id = p_content_id;

  RETURN QUERY
  SELECT content.id, content.status
  FROM content
  WHERE content.id = p_content_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Helper: get user votes for multiple content IDs
CREATE OR REPLACE FUNCTION get_user_content_votes(p_content_ids UUID[])
RETURNS TABLE(content_id UUID, vote_type TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT cv.content_id, cv.vote_type
  FROM content_votes cv
  WHERE cv.content_id = ANY(p_content_ids)
    AND cv.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Helper: get user votes for multiple all-star IDs
CREATE OR REPLACE FUNCTION get_user_all_star_votes(p_all_star_ids UUID[])
RETURNS TABLE(all_star_id UUID, vote_type TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT av.all_star_id, av.vote_type
  FROM all_star_votes av
  WHERE av.all_star_id = ANY(p_all_star_ids)
    AND av.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
