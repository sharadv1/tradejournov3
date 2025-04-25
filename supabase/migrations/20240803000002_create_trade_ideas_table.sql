-- Create trade_ideas table
CREATE TABLE IF NOT EXISTS trade_ideas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  r_multiple NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trade_idea_media table for storing media files
CREATE TABLE IF NOT EXISTS trade_idea_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trade_idea_id UUID REFERENCES trade_ideas(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE trade_ideas;
ALTER PUBLICATION supabase_realtime ADD TABLE trade_idea_media;
