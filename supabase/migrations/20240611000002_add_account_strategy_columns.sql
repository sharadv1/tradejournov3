-- Add account_name and strategy_name columns to the trades table
ALTER TABLE trades
ADD COLUMN IF NOT EXISTS account_name TEXT,
ADD COLUMN IF NOT EXISTS strategy_name TEXT;

-- Update realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE trades;