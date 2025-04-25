-- Add position_size_closed column to trades table
ALTER TABLE trades ADD COLUMN IF NOT EXISTS position_size_closed NUMERIC DEFAULT 0;
