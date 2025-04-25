-- Drop existing tables if they exist
DROP TABLE IF EXISTS trade_idea_media;
DROP TABLE IF EXISTS trade_ideas;

-- Recreate the tables with proper UUID constraints
CREATE TABLE IF NOT EXISTS trade_ideas (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  r_multiple NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trade_idea_media (
  id UUID PRIMARY KEY,
  trade_idea_id UUID REFERENCES trade_ideas(id),
  user_id UUID REFERENCES auth.users(id),
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_name TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE trade_ideas;
ALTER PUBLICATION supabase_realtime ADD TABLE trade_idea_media;
