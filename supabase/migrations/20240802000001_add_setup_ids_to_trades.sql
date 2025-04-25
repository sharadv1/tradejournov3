-- Add setup_ids column to trades table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'setup_ids') THEN
    ALTER TABLE trades ADD COLUMN setup_ids TEXT[] DEFAULT '{}' NOT NULL;
  END IF;
END $$;

-- Create a junction table for trades and setups if it doesn't exist
CREATE TABLE IF NOT EXISTS trade_setups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  setup_id UUID NOT NULL REFERENCES setups(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(trade_id, setup_id)
);

-- Add realtime publication for trade_setups
alter publication supabase_realtime add table trade_setups;
