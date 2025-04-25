-- Add entry_trigger column to trades table
ALTER TABLE trades ADD COLUMN IF NOT EXISTS entry_trigger TEXT;
