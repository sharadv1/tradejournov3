-- Update MNQ symbol data to ensure it has correct tick size and tick value
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM symbols WHERE LOWER(symbol) = 'mnq') THEN
        UPDATE symbols
        SET 
            tick_size = 0.25,
            tick_value = 0.50,
            is_futures = true
        WHERE LOWER(symbol) = 'mnq';
    ELSE
        INSERT INTO symbols (symbol, name, tick_size, tick_value, is_futures)
        VALUES ('MNQ', 'Micro Nasdaq', 0.25, 0.50, true);
    END IF;
END
$$;