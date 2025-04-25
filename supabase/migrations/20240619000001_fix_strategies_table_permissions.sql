-- Ensure strategies table exists with proper structure
CREATE TABLE IF NOT EXISTS strategies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS on strategies table
ALTER TABLE strategies DISABLE ROW LEVEL SECURITY;

-- Only add to realtime if not already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'strategies'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE strategies;
  END IF;
END
$$;

-- Grant all privileges to authenticated users
GRANT ALL PRIVILEGES ON TABLE strategies TO authenticated;
GRANT ALL PRIVILEGES ON TABLE strategies TO anon;
GRANT ALL PRIVILEGES ON TABLE strategies TO service_role;
