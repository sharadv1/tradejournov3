-- Add updated_at column to trade_ideas table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trade_ideas' AND column_name = 'updated_at') THEN
        ALTER TABLE trade_ideas ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;

-- Add file_name column to trade_idea_media table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trade_idea_media' AND column_name = 'file_name') THEN
        ALTER TABLE trade_idea_media ADD COLUMN file_name TEXT;
    END IF;
END $$;

-- Make sure both tables are in the realtime publication
-- Using IF NOT EXISTS logic to avoid errors if they're already members
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'trade_idea_media'
    ) THEN
        ALTER publication supabase_realtime ADD TABLE trade_idea_media;
    END IF;
END $$;