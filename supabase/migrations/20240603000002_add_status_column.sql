-- Add status column to trades table
ALTER TABLE trades ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open';
