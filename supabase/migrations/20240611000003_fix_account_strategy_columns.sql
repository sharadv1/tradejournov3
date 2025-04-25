-- This migration fixes the previous migration by not attempting to add trades to supabase_realtime again
-- It only adds the columns if they don't exist yet

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'account_name') THEN
        ALTER TABLE trades ADD COLUMN account_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'strategy_name') THEN
        ALTER TABLE trades ADD COLUMN strategy_name TEXT;
    END IF;
END $$;
