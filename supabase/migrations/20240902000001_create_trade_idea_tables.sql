-- Create trade_ideas table if it doesn't exist
CREATE TABLE IF NOT EXISTS trade_ideas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  type TEXT NOT NULL,
  r_multiple NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable row level security
ALTER TABLE trade_ideas ENABLE ROW LEVEL SECURITY;

-- Create policy for trade_ideas
DROP POLICY IF EXISTS "Users can only access their own trade ideas" ON trade_ideas;
CREATE POLICY "Users can only access their own trade ideas"
  ON trade_ideas
  USING (user_id = auth.uid());

-- Create trade_idea_media table
CREATE TABLE IF NOT EXISTS trade_idea_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trade_idea_id UUID REFERENCES trade_ideas(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable row level security
ALTER TABLE trade_idea_media ENABLE ROW LEVEL SECURITY;

-- Create policy for trade_idea_media
DROP POLICY IF EXISTS "Users can only access their own trade idea media" ON trade_idea_media;
CREATE POLICY "Users can only access their own trade idea media"
  ON trade_idea_media
  USING (user_id = auth.uid());

-- Add to realtime publication
alter publication supabase_realtime add table trade_ideas;
alter publication supabase_realtime add table trade_idea_media;
