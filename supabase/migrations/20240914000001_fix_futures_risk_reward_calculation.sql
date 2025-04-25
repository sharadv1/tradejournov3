-- Create a function to calculate risk reward for futures contracts based on symbol info
CREATE OR REPLACE FUNCTION calculate_futures_risk_reward()
RETURNS TRIGGER AS $$
DECLARE
    symbol_info RECORD;
    tick_size NUMERIC;
    tick_value NUMERIC;
    price_diff NUMERIC;
    ticks_of_risk NUMERIC;
    risk_amount NUMERIC;
BEGIN
    -- Get symbol info for the trade's symbol
    SELECT * INTO symbol_info FROM symbols WHERE LOWER(symbol) = LOWER(NEW.symbol);
    
    -- If symbol info exists and it's a futures contract
    IF FOUND AND symbol_info.is_futures = TRUE THEN
        -- Use the symbol's tick size and tick value
        tick_size := COALESCE(symbol_info.tick_size, 0.25);
        tick_value := COALESCE(symbol_info.tick_value, 1.25);
        
        -- Calculate price difference based on direction
        IF NEW.direction = 'long' THEN
            price_diff := ABS(NEW.entry_price - NEW.initial_stop_loss);
        ELSE
            price_diff := ABS(NEW.initial_stop_loss - NEW.entry_price);
        END IF;
        
        -- Calculate ticks of risk and risk amount
        ticks_of_risk := price_diff / tick_size;
        risk_amount := ticks_of_risk * tick_value * NEW.position_size;
        
        -- Update the risk_amount field
        NEW.risk_amount := risk_amount;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS calculate_futures_risk_reward_trigger ON trades;

-- Create trigger to calculate risk reward for futures contracts
CREATE TRIGGER calculate_futures_risk_reward_trigger
BEFORE INSERT OR UPDATE ON trades
FOR EACH ROW
WHEN (NEW.symbol IS NOT NULL AND NEW.entry_price IS NOT NULL AND NEW.initial_stop_loss IS NOT NULL AND NEW.position_size IS NOT NULL)
EXECUTE FUNCTION calculate_futures_risk_reward();
