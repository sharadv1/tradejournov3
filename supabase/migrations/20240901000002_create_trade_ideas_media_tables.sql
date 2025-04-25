-- Create trade_ideas table if it doesn't exist
CREATE TABLE IF NOT EXISTS trade_ideas (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  r_multiple NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create media_files table if it doesn't exist
CREATE TABLE IF NOT EXISTS media_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trade_idea_id TEXT REFERENCES trade_ideas(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_name TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE trade_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;

-- Create policies for trade_ideas
DROP POLICY IF EXISTS "Users can view their own trade ideas" ON trade_ideas;
CREATE POLICY "Users can view their own trade ideas"
  ON trade_ideas
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own trade ideas" ON trade_ideas;
CREATE POLICY "Users can insert their own trade ideas"
  ON trade_ideas
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own trade ideas" ON trade_ideas;
CREATE POLICY "Users can update their own trade ideas"
  ON trade_ideas
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own trade ideas" ON trade_ideas;
CREATE POLICY "Users can delete their own trade ideas"
  ON trade_ideas
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for media_files
DROP POLICY IF EXISTS "Users can view media files for their trade ideas" ON media_files;
CREATE POLICY "Users can view media files for their trade ideas"
  ON media_files
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM trade_ideas
    WHERE trade_ideas.id = media_files.trade_idea_id
    AND trade_ideas.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can insert media files for their trade ideas" ON media_files;
CREATE POLICY "Users can insert media files for their trade ideas"
  ON media_files
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM trade_ideas
    WHERE trade_ideas.id = media_files.trade_idea_id
    AND trade_ideas.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can update media files for their trade ideas" ON media_files;
CREATE POLICY "Users can update media files for their trade ideas"
  ON media_files
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM trade_ideas
    WHERE trade_ideas.id = media_files.trade_idea_id
    AND trade_ideas.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can delete media files for their trade ideas" ON media_files;
CREATE POLICY "Users can delete media files for their trade ideas"
  ON media_files
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM trade_ideas
    WHERE trade_ideas.id = media_files.trade_idea_id
    AND trade_ideas.user_id = auth.uid()
  ));

-- Enable realtime
alter publication supabase_realtime add table trade_ideas;
alter publication supabase_realtime add table media_files;

-- Create storage bucket for media files if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'media');

DROP POLICY IF EXISTS "Individual user upload access" ON storage.objects;
CREATE POLICY "Individual user upload access"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'media' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Individual user delete access" ON storage.objects;
CREATE POLICY "Individual user delete access"
ON storage.objects FOR DELETE
USING (bucket_id = 'media' AND auth.uid() IS NOT NULL);
