-- Create trade_closures table if it doesn't exist
CREATE TABLE IF NOT EXISTS trade_closures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  close_date DATE NOT NULL,
  close_time TIME NOT NULL,
  close_price DECIMAL(15, 2) NOT NULL,
  closed_position_size DECIMAL(15, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable realtime for trade_closures
alter publication supabase_realtime add table trade_closures;

-- Create trigger to update trades table when a closure is added
CREATE OR REPLACE FUNCTION update_trade_on_closure()
RETURNS TRIGGER AS $$
DECLARE
  total_closed DECIMAL(15, 2);
  total_position DECIMAL(15, 2);
  remaining DECIMAL(15, 2);
  new_status TEXT;
BEGIN
  -- Get the total position size from the trade
  SELECT position_size INTO total_position FROM trades WHERE id = NEW.trade_id;
  
  -- Calculate total closed position size including this closure
  SELECT COALESCE(SUM(closed_position_size), 0) INTO total_closed 
  FROM trade_closures 
  WHERE trade_id = NEW.trade_id;
  
  -- Calculate remaining position size
  remaining := total_position - total_closed;
  
  -- Determine new status based on remaining size
  IF remaining <= 0 THEN
    new_status := 'closed';
  ELSE
    new_status := 'partial';
  END IF;
  
  -- Update the trade record
  UPDATE trades SET
    exit_price = NEW.close_price,
    position_size_closed = total_closed,
    remaining_size = remaining,
    status = new_status,
    updated_at = NOW()
  WHERE id = NEW.trade_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_update_trade_on_closure ON trade_closures;
CREATE TRIGGER trigger_update_trade_on_closure
AFTER INSERT ON trade_closures
FOR EACH ROW
EXECUTE FUNCTION update_trade_on_closure();
