-- Simplify R multiple calculation to use PL/initial risk formula

-- Update the r_multiple calculation in the trigger function
CREATE OR REPLACE FUNCTION calculate_r_multiple()
RETURNS TRIGGER AS $$
DECLARE
  trade_record RECORD;
  initial_risk NUMERIC(10,2);
  profit_loss NUMERIC(10,2);
  symbol_name TEXT;
  is_futures BOOLEAN;
  tick_size NUMERIC(10,2);
  tick_value NUMERIC(10,2);
  entry_exit_diff NUMERIC(10,2);
  stop_diff NUMERIC(10,2);
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
      IF symbol_name = 'es' THEN
        tick_size := 0.25;
        tick_value := 12.5;
      ELSIF symbol_name = 'nq' THEN
        tick_size := 0.25;
        tick_value := 5.0;
      ELSE
        -- Default for MES
        tick_size := 0.25;
        tick_value := 1.25;
      END IF;
    END IF;
    
    -- Calculate the difference between entry and exit
    IF trade_record.direction = 'long' THEN
      entry_exit_diff := NEW.close_price - trade_record.entry_price;
      stop_diff := trade_record.entry_price - trade_record.initial_stop_loss;
    ELSE
      entry_exit_diff := trade_record.entry_price - NEW.close_price;
      stop_diff := trade_record.initial_stop_loss - trade_record.entry_price;
    END IF;
    
    -- For futures, convert to ticks then to dollar value
    IF is_futures THEN
      -- Convert entry-exit difference to ticks then to dollars (PL)
      profit_loss := (entry_exit_diff / tick_size) * tick_value * NEW.closed_position_size;
      
      -- Convert stop difference to ticks then to dollars (initial risk)
      initial_risk := (ABS(stop_diff) / tick_size) * tick_value * NEW.closed_position_size;
    ELSE
      -- For non-futures, use price differences directly
      profit_loss := entry_exit_diff * NEW.closed_position_size;
      initial_risk := ABS(stop_diff) * NEW.closed_position_size;
    END IF;
    
    -- Calculate R multiple (profit/loss divided by initial risk)
    IF initial_risk <> 0 THEN
      NEW.r_multiple := ROUND((profit_loss / initial_risk)::numeric, 2);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recalculate R multiples for existing trade closures
UPDATE trade_closures
SET r_multiple = 
  CASE 
    WHEN trades.direction = 'long' AND LOWER(trades.symbol) IN ('mes', 'es', 'nq') THEN
      ROUND((
        ((trade_closures.close_price - trades.entry_price) / 0.25) * 
        CASE 
          WHEN LOWER(trades.symbol) = 'es' THEN 12.5
          WHEN LOWER(trades.symbol) = 'nq' THEN 5.0
          ELSE 1.25 -- Default for MES
        END * trade_closures.closed_position_size
      ) / (
        ((trades.entry_price - trades.initial_stop_loss) / 0.25) * 
        CASE 
          WHEN LOWER(trades.symbol) = 'es' THEN 12.5
          WHEN LOWER(trades.symbol) = 'nq' THEN 5.0
          ELSE 1.25 -- Default for MES
        END * trade_closures.closed_position_size
      ), 2)
    WHEN trades.direction = 'short' AND LOWER(trades.symbol) IN ('mes', 'es', 'nq') THEN
      ROUND((
        ((trades.entry_price - trade_closures.close_price) / 0.25) * 
        CASE 
          WHEN LOWER(trades.symbol) = 'es' THEN 12.5
          WHEN LOWER(trades.symbol) = 'nq' THEN 5.0
          ELSE 1.25 -- Default for MES
        END * trade_closures.closed_position_size
      ) / (
        ((trades.initial_stop_loss - trades.entry_price) / 0.25) * 
        CASE 
          WHEN LOWER(trades.symbol) = 'es' THEN 12.5
          WHEN LOWER(trades.symbol) = 'nq' THEN 5.0
          ELSE 1.25 -- Default for MES
        END * trade_closures.closed_position_size
      ), 2)
    WHEN trades.direction = 'long' THEN
      ROUND((
        (trade_closures.close_price - trades.entry_price) * trade_closures.closed_position_size
      ) / (
        ABS(trades.entry_price - trades.initial_stop_loss) * trade_closures.closed_position_size
      ), 2)
    ELSE
      ROUND((
        (trades.entry_price - trade_closures.close_price) * trade_closures.closed_position_size
      ) / (
        ABS(trades.initial_stop_loss - trades.entry_price) * trade_closures.closed_position_size
      ), 2)
  END
FROM trades
WHERE 
  trade_closures.trade_id = trades.id
  AND trades.initial_stop_loss IS NOT NULL
  AND trades.entry_price IS NOT NULL
  AND trades.entry_price != trades.initial_stop_loss;