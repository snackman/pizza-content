-- Migration: 008_add_recipes_table
-- Description: Add recipes table for creative pizza recipe ideas
-- Applied via Supabase MCP (already applied to production)

-- New enums
CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard', 'expert');
CREATE TYPE cooking_method AS ENUM ('oven', 'wood_fired', 'grill', 'skillet', 'deep_fried', 'air_fryer', 'no_bake', 'other');

-- Recipes table
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  sauce_type TEXT,
  cheese_types TEXT[] DEFAULT '{}',
  toppings TEXT[] DEFAULT '{}',
  dough_style TEXT,
  cooking_method cooking_method DEFAULT 'oven',
  difficulty difficulty_level DEFAULT 'medium',
  prep_notes TEXT,
  serving_size TEXT,
  image_url TEXT,
  thumbnail_url TEXT,
  source_url TEXT,
  tags TEXT[] DEFAULT '{}',
  is_vegetarian BOOLEAN DEFAULT FALSE,
  is_vegan BOOLEAN DEFAULT FALSE,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  status content_status DEFAULT 'approved',
  submitted_by UUID REFERENCES profiles(id),
  creator TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Anyone can view approved recipes"
  ON recipes FOR SELECT
  USING (status IN ('approved', 'featured'));

-- Authenticated insert
CREATE POLICY "Authenticated users can submit recipes"
  ON recipes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = submitted_by);

-- Owner update
CREATE POLICY "Users can update own recipes"
  ON recipes FOR UPDATE
  TO authenticated
  USING (auth.uid() = submitted_by);

-- Owner delete
CREATE POLICY "Users can delete own recipes"
  ON recipes FOR DELETE
  TO authenticated
  USING (auth.uid() = submitted_by);

-- Indexes
CREATE INDEX idx_recipes_status ON recipes(status);
CREATE INDEX idx_recipes_difficulty ON recipes(difficulty);
CREATE INDEX idx_recipes_cooking_method ON recipes(cooking_method);
CREATE INDEX idx_recipes_created_at ON recipes(created_at DESC);
CREATE INDEX idx_recipes_submitted_by ON recipes(submitted_by);

-- Vote function
CREATE OR REPLACE FUNCTION vote_recipe(p_recipe_id UUID, p_vote_type TEXT)
RETURNS TABLE(upvotes INT, downvotes INT) AS $$
BEGIN
  IF p_vote_type = 'up' THEN
    UPDATE recipes SET upvotes = recipes.upvotes + 1 WHERE id = p_recipe_id;
  ELSIF p_vote_type = 'down' THEN
    UPDATE recipes SET downvotes = recipes.downvotes + 1 WHERE id = p_recipe_id;
  END IF;
  RETURN QUERY SELECT recipes.upvotes, recipes.downvotes FROM recipes WHERE id = p_recipe_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated_at trigger
CREATE TRIGGER update_recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
