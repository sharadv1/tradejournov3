-- Fix date and time columns in trades table to accept string values
ALTER TABLE trades ALTER COLUMN date TYPE TEXT;
ALTER TABLE trades ALTER COLUMN time TYPE TEXT;

-- Enable realtime for trades table
alter publication supabase_realtime add table trades;
