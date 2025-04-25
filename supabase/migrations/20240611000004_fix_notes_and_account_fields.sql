-- This migration ensures notes, account_name, and strategy_name are properly stored

-- Update any null account_name or strategy_name to empty string for consistency
UPDATE trades
SET account_name = ''
WHERE account_name IS NULL;

UPDATE trades
SET strategy_name = ''
WHERE strategy_name IS NULL;

-- Ensure notes field is properly initialized
UPDATE trades
SET notes = ''
WHERE notes IS NULL;
