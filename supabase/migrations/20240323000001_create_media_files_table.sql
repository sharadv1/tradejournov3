-- Create media_files table if it doesn't exist
CREATE TABLE IF NOT EXISTS media_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint on file_path
ALTER TABLE media_files DROP CONSTRAINT IF EXISTS media_files_file_path_key;
ALTER TABLE media_files ADD CONSTRAINT media_files_file_path_key UNIQUE (file_path);

-- Enable row-level security
ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;

-- Create policy for media_files
DROP POLICY IF EXISTS "Users can manage their own media files" ON media_files;
CREATE POLICY "Users can manage their own media files"
ON media_files
USING (
  trade_id IN (
    SELECT id FROM trades WHERE user_id = auth.uid()
  )
);

-- Add to realtime publication
-- Check if table is already in publication before adding
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'media_files'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE media_files;
  END IF;
END
$$;