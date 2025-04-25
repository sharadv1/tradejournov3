-- Create accounts table if it doesn't exist yet
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

-- Enable realtime for accounts table
ALTER PUBLICATION supabase_realtime ADD TABLE accounts;
