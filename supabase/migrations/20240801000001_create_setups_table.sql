-- Create setups table
CREATE TABLE IF NOT EXISTS setups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT[],
  trade_id UUID REFERENCES trades(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create setup_media table for images and videos
CREATE TABLE IF NOT EXISTS setup_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setup_id UUID NOT NULL REFERENCES setups(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable realtime for both tables
alter publication supabase_realtime add table setups;
alter publication supabase_realtime add table setup_media;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS setups_user_id_idx ON setups(user_id);
CREATE INDEX IF NOT EXISTS setups_trade_id_idx ON setups(trade_id);
CREATE INDEX IF NOT EXISTS setup_media_setup_id_idx ON setup_media(setup_id);
