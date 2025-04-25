-- Ensure accounts table exists with proper structure
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS on accounts table
ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;

-- Only add to realtime if not already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'accounts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE accounts;
  END IF;
END
$$;

-- Grant all privileges to authenticated users
GRANT ALL PRIVILEGES ON TABLE accounts TO authenticated;
GRANT ALL PRIVILEGES ON TABLE accounts TO anon;
GRANT ALL PRIVILEGES ON TABLE accounts TO service_role;
