-- Pizza Content RLS Policies
-- Run this AFTER 001_initial_schema.sql

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE view_history ENABLE ROW LEVEL SECURITY;

-- Profiles: Public read, own write
CREATE POLICY "Profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Content: Public read approved, submitter can manage own
CREATE POLICY "Approved content is viewable by everyone" ON content
  FOR SELECT USING (status = 'approved' OR status = 'featured' OR submitted_by = auth.uid());
CREATE POLICY "Authenticated users can submit content" ON content
  FOR INSERT WITH CHECK (auth.uid() = submitted_by);
CREATE POLICY "Users can update own content" ON content
  FOR UPDATE USING (auth.uid() = submitted_by);
CREATE POLICY "Users can delete own content" ON content
  FOR DELETE USING (auth.uid() = submitted_by);

-- Requests: Public read, own manage
CREATE POLICY "Requests are viewable by everyone" ON content_requests
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create requests" ON content_requests
  FOR INSERT WITH CHECK (auth.uid() = requested_by);
CREATE POLICY "Users can update own requests" ON content_requests
  FOR UPDATE USING (auth.uid() = requested_by);
CREATE POLICY "Users can delete own requests" ON content_requests
  FOR DELETE USING (auth.uid() = requested_by);

-- Favorites: Own only
CREATE POLICY "Users can view own favorites" ON favorites
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can add favorites" ON favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove favorites" ON favorites
  FOR DELETE USING (auth.uid() = user_id);

-- View history: Own only
CREATE POLICY "Users can view own history" ON view_history
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can add to own history" ON view_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);
