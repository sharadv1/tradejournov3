-- Fix the trade_ideas and trade_idea_media tables to ensure proper UUID handling

-- First, create a temporary table to store existing data
CREATE TABLE IF NOT EXISTS temp_trade_ideas (
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

-- Create a temporary table for media files
CREATE TABLE IF NOT EXISTS temp_trade_idea_media (
  id UUID PRIMARY KEY,
  trade_idea_id UUID REFERENCES temp_trade_ideas(id),
  user_id UUID REFERENCES auth.users(id),
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_name TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

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

-- Copy data from temp tables if they have data
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM temp_trade_ideas LIMIT 1) THEN
    INSERT INTO trade_ideas
    SELECT * FROM temp_trade_ideas;
  END IF;
  
  IF EXISTS (SELECT 1 FROM temp_trade_idea_media LIMIT 1) THEN
    INSERT INTO trade_idea_media
    SELECT * FROM temp_trade_idea_media;
  END IF;
END $$;

-- Drop temporary tables
DROP TABLE IF EXISTS temp_trade_idea_media;
DROP TABLE IF EXISTS temp_trade_ideas;

-- Add tables to realtime publication
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'trade_ideas'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE trade_ideas;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'trade_idea_media'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE trade_idea_media;
  END IF;
END $$;
