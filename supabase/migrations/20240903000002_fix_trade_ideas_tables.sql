-- Add missing updated_at column to trade_ideas table
ALTER TABLE trade_ideas ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Add missing file_name column to trade_idea_media table
ALTER TABLE trade_idea_media ADD COLUMN IF NOT EXISTS file_name TEXT;

-- Only add tables to realtime if they're not already members
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
END
$$;