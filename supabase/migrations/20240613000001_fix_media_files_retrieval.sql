-- Add index to media_files table for faster lookups
CREATE INDEX IF NOT EXISTS idx_media_files_trade_id ON media_files(trade_id);

-- Ensure media_files table has proper RLS policies
ALTER TABLE media_files DISABLE ROW LEVEL SECURITY;

-- Update the media_files table to ensure file_path is unique
ALTER TABLE media_files DROP CONSTRAINT IF EXISTS media_files_file_path_key;
ALTER TABLE media_files ADD CONSTRAINT media_files_file_path_key UNIQUE (file_path);
