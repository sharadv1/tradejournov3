-- Create trade_idea_media table if it doesn't exist
CREATE TABLE IF NOT EXISTS trade_idea_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trade_idea_id UUID REFERENCES trade_ideas(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_name TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable row level security
ALTER TABLE trade_idea_media ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Users can view their own trade idea media" ON trade_idea_media;
CREATE POLICY "Users can view their own trade idea media"
  ON trade_idea_media
  FOR SELECT
  USING (
    auth.uid() = (SELECT user_id FROM trade_ideas WHERE id = trade_idea_id)
  );

DROP POLICY IF EXISTS "Users can insert their own trade idea media" ON trade_idea_media;
CREATE POLICY "Users can insert their own trade idea media"
  ON trade_idea_media
  FOR INSERT
  WITH CHECK (
    auth.uid() = (SELECT user_id FROM trade_ideas WHERE id = trade_idea_id)
  );

DROP POLICY IF EXISTS "Users can update their own trade idea media" ON trade_idea_media;
CREATE POLICY "Users can update their own trade idea media"
  ON trade_idea_media
  FOR UPDATE
  USING (
    auth.uid() = (SELECT user_id FROM trade_ideas WHERE id = trade_idea_id)
  );

DROP POLICY IF EXISTS "Users can delete their own trade idea media" ON trade_idea_media;
CREATE POLICY "Users can delete their own trade idea media"
  ON trade_idea_media
  FOR DELETE
  USING (
    auth.uid() = (SELECT user_id FROM trade_ideas WHERE id = trade_idea_id)
  );

-- Add realtime
alter publication supabase_realtime add table trade_idea_media;
