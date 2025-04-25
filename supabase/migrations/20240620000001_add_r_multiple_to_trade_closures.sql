-- Add r_multiple column to trade_closures table
ALTER TABLE trade_closures ADD COLUMN IF NOT EXISTS r_multiple NUMERIC(10, 2);

-- Create function to calculate R multiple
CREATE OR REPLACE FUNCTION calculate_r_multiple()
RETURNS TRIGGER AS $$
DECLARE
  trade_record RECORD;
  risk_value NUMERIC;
  profit_value NUMERIC;
BEGIN
  -- Get the trade details
  SELECT * INTO trade_record FROM trades WHERE id = NEW.trade_id;
  
  -- Skip calculation if initial_stop_loss is not set
  IF trade_record.initial_stop_loss IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Calculate risk based on direction
  IF trade_record.direction = 'long' THEN
    risk_value = ABS(trade_record.entry_price - trade_record.initial_stop_loss);
    profit_value = NEW.close_price - trade_record.entry_price;
  ELSE
    risk_value = ABS(trade_record.initial_stop_loss - trade_record.entry_price);
    profit_value = trade_record.entry_price - NEW.close_price;
  END IF;
  
  -- Skip if risk is zero to avoid division by zero
  IF risk_value = 0 THEN
    RETURN NEW;
  END IF;
  
  -- Calculate R multiple
  NEW.r_multiple = profit_value / risk_value;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to calculate R multiple on insert
DROP TRIGGER IF EXISTS calculate_r_multiple_trigger ON trade_closures;
CREATE TRIGGER calculate_r_multiple_trigger
BEFORE INSERT ON trade_closures
FOR EACH ROW
EXECUTE FUNCTION calculate_r_multiple();

-- Create trigger to calculate R multiple on update
DROP TRIGGER IF EXISTS calculate_r_multiple_update_trigger ON trade_closures;
CREATE TRIGGER calculate_r_multiple_update_trigger
BEFORE UPDATE ON trade_closures
FOR EACH ROW
EXECUTE FUNCTION calculate_r_multiple();