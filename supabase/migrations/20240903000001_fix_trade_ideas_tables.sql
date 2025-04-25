-- Add missing updated_at column to trade_ideas table
ALTER TABLE trade_ideas ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Add missing file_name column to trade_idea_media table
ALTER TABLE trade_idea_media ADD COLUMN IF NOT EXISTS file_name TEXT;

-- Enable realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE trade_ideas;
ALTER PUBLICATION supabase_realtime ADD TABLE trade_idea_media;
