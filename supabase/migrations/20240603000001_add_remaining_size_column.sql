-- Add remaining_size column to trades table
ALTER TABLE trades ADD COLUMN IF NOT EXISTS remaining_size NUMERIC DEFAULT 0;
