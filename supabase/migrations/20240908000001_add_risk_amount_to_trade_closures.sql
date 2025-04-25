-- Add risk_amount column to trade_closures table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trade_closures' AND column_name = 'risk_amount') THEN
        ALTER TABLE trade_closures ADD COLUMN risk_amount DECIMAL;
    END IF;
END
$$;