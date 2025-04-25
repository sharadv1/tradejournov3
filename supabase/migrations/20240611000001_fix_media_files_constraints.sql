-- Fix constraints on media_files table to ensure it works properly with trade references

-- First, check if the media_files table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'media_files') THEN
    -- Drop the constraint if it exists
    ALTER TABLE IF EXISTS media_files DROP CONSTRAINT IF EXISTS media_files_trade_id_fkey;
    
    -- Re-add the constraint with ON DELETE CASCADE
    ALTER TABLE media_files ADD CONSTRAINT media_files_trade_id_fkey 
      FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE;
  END IF;
END
$$;

-- Ensure the media bucket exists
DO $$
BEGIN
  -- This is a placeholder as bucket creation is handled in the application code
  -- We can't directly create buckets in SQL migrations
END
$$;
