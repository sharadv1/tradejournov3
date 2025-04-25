-- Fix R multiple calculation for existing trade closures

-- Update the r_multiple field for trade closures where it's null but can be calculated
UPDATE trade_closures
SET r_multiple = 
  CASE 
    WHEN trades.direction = 'long' THEN 
      (trade_closures.close_price - trades.entry_price) / ABS(trades.entry_price - trades.initial_stop_loss)
    ELSE 
      (trades.entry_price - trade_closures.close_price) / ABS(trades.entry_price - trades.initial_stop_loss)
  END
FROM trades
WHERE 
  trade_closures.trade_id = trades.id
  AND trade_closures.r_multiple IS NULL
  AND trades.initial_stop_loss IS NOT NULL
  AND trades.entry_price IS NOT NULL
  AND trades.entry_price != trades.initial_stop_loss;

-- Add a trigger to automatically calculate r_multiple on insert if not provided
CREATE OR REPLACE FUNCTION calculate_r_multiple()
RETURNS TRIGGER AS $$
DECLARE
  trade_record RECORD;
  r_value NUMERIC;
  profit NUMERIC;
BEGIN
  -- Get the trade record
  SELECT * INTO trade_record FROM trades WHERE id = NEW.trade_id;
  
  -- Only calculate if we have the necessary data and r_multiple is not already set
  IF NEW.r_multiple IS NULL AND 
     trade_record.initial_stop_loss IS NOT NULL AND 
     trade_record.entry_price IS NOT NULL AND 
     trade_record.entry_price != trade_record.initial_stop_loss THEN
    
    -- Calculate the R value (risk per share)
    IF trade_record.direction = 'long' THEN
      r_value := ABS(trade_record.entry_price - trade_record.initial_stop_loss);
    ELSE
      r_value := ABS(trade_record.initial_stop_loss - trade_record.entry_price);
    END IF;
    
    -- Calculate profit
    IF trade_record.direction = 'long' THEN
      profit := NEW.close_price - trade_record.entry_price;
    ELSE
      profit := trade_record.entry_price - NEW.close_price;
    END IF;
    
    -- Calculate R multiple
    NEW.r_multiple := profit / r_value;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS calculate_r_multiple_trigger ON trade_closures;

-- Create the trigger
CREATE TRIGGER calculate_r_multiple_trigger
BEFORE INSERT ON trade_closures
FOR EACH ROW
EXECUTE FUNCTION calculate_r_multiple();
