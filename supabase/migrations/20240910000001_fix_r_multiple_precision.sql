-- Fix R multiple calculation precision issues

-- Update the r_multiple calculation in the trigger function to use exact decimal arithmetic
CREATE OR REPLACE FUNCTION calculate_r_multiple()
RETURNS TRIGGER AS $$
DECLARE
  trade_record RECORD;
  r_value NUMERIC(10,2);
  profit NUMERIC(10,2);
  symbol_name TEXT;
  is_futures BOOLEAN;
  tick_size NUMERIC(10,2);
  tick_value NUMERIC(10,2);
BEGIN
  -- Get the trade record
  SELECT * INTO trade_record FROM trades WHERE id = NEW.trade_id;
  
  -- Only calculate if we have the necessary data and r_multiple is not already set
  IF NEW.r_multiple IS NULL AND 
     trade_record.initial_stop_loss IS NOT NULL AND 
     trade_record.entry_price IS NOT NULL AND 
     trade_record.entry_price != trade_record.initial_stop_loss THEN
    
    -- Get symbol name and check if it's futures
    symbol_name = LOWER(trade_record.symbol);
    is_futures = symbol_name IN ('mes', 'es', 'nq');
    
    -- Set tick size and value for futures
    IF is_futures THEN
      tick_size := 0.25;
      
      IF symbol_name = 'es' THEN
        tick_value := 12.5;
      ELSIF symbol_name = 'nq' THEN
        tick_value := 5.0;
      ELSE
        tick_value := 1.25; -- Default for MES
      END IF;
    END IF;
    
    -- Calculate the R value (risk per share)
    IF trade_record.direction = 'long' THEN
      r_value := ABS(trade_record.entry_price - trade_record.initial_stop_loss);
    ELSE
      r_value := ABS(trade_record.initial_stop_loss - trade_record.entry_price);
    END IF;
    
    -- For futures, convert to dollar risk
    IF is_futures THEN
      r_value := (r_value / tick_size) * tick_value;
    END IF;
    
    -- Calculate profit
    IF trade_record.direction = 'long' THEN
      profit := NEW.close_price - trade_record.entry_price;
    ELSE
      profit := trade_record.entry_price - NEW.close_price;
    END IF;
    
    -- For futures, convert to dollar profit
    IF is_futures THEN
      profit := (ABS(profit) / tick_size) * tick_value;
      IF (trade_record.direction = 'long' AND NEW.close_price < trade_record.entry_price) OR
         (trade_record.direction = 'short' AND NEW.close_price > trade_record.entry_price) THEN
        profit := -profit;
      END IF;
    END IF;
    
    -- Calculate R multiple with exact precision
    profit := profit * NEW.closed_position_size;
    r_value := r_value * NEW.closed_position_size;
    
    -- Ensure we don't divide by zero
    IF r_value <> 0 THEN
      NEW.r_multiple := ROUND((profit / r_value)::numeric, 2);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recalculate R multiples for existing trade closures
UPDATE trade_closures
SET r_multiple = 
  CASE 
    WHEN trades.direction = 'long' THEN 
      ROUND(((trade_closures.close_price - trades.entry_price) * trade_closures.closed_position_size) / 
      (ABS(trades.entry_price - trades.initial_stop_loss) * trade_closures.closed_position_size), 2)
    ELSE 
      ROUND(((trades.entry_price - trade_closures.close_price) * trade_closures.closed_position_size) / 
      (ABS(trades.entry_price - trades.initial_stop_loss) * trade_closures.closed_position_size), 2)
  END
FROM trades
WHERE 
  trade_closures.trade_id = trades.id
  AND trades.initial_stop_loss IS NOT NULL
  AND trades.entry_price IS NOT NULL
  AND trades.entry_price != trades.initial_stop_loss
  AND trades.symbol = 'MES';
