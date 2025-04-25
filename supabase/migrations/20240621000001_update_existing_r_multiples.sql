-- Update existing trade closures with R multiple values
DO $$
DECLARE
  closure_record RECORD;
  trade_record RECORD;
  risk_value NUMERIC;
  profit_value NUMERIC;
  r_multiple_value NUMERIC;
BEGIN
  -- Loop through all trade closures
  FOR closure_record IN SELECT * FROM trade_closures WHERE r_multiple IS NULL LOOP
    -- Get the trade details
    SELECT * INTO trade_record FROM trades WHERE id = closure_record.trade_id;
    
    -- Skip calculation if initial_stop_loss is not set
    IF trade_record.initial_stop_loss IS NULL THEN
      CONTINUE;
    END IF;
    
    -- Calculate risk based on direction
    IF trade_record.direction = 'long' THEN
      risk_value = ABS(trade_record.entry_price - trade_record.initial_stop_loss);
      profit_value = closure_record.close_price - trade_record.entry_price;
    ELSE
      risk_value = ABS(trade_record.initial_stop_loss - trade_record.entry_price);
      profit_value = trade_record.entry_price - closure_record.close_price;
    END IF;
    
    -- Skip if risk is zero to avoid division by zero
    IF risk_value = 0 THEN
      CONTINUE;
    END IF;
    
    -- Calculate R multiple
    r_multiple_value = profit_value / risk_value;
    
    -- Update the closure record
    UPDATE trade_closures SET r_multiple = r_multiple_value WHERE id = closure_record.id;
  END LOOP;
END;
$$;