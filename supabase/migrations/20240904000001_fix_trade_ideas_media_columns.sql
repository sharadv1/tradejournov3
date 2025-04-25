-- Add missing columns to trade_ideas and trade_idea_media tables if they don't exist

-- Check if updated_at column exists in trade_ideas table, if not add it
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trade_ideas' AND column_name = 'updated_at') THEN
    ALTER TABLE trade_ideas ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- Check if file_name column exists in trade_idea_media table, if not add it
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trade_idea_media' AND column_name = 'file_name') THEN
    ALTER TABLE trade_idea_media ADD COLUMN file_name TEXT;
  END IF;
END $$;

-- Safely add tables to realtime publication if they're not already members
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
