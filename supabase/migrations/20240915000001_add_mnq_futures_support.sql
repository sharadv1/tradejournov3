-- Add MNQ to the list of supported futures contracts
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM symbols WHERE LOWER(symbol) = 'mnq') THEN
        INSERT INTO symbols (symbol, name, is_futures, tick_size, tick_value)
        VALUES ('MNQ', 'Micro Nasdaq', true, 0.25, 0.50);
    ELSE
        UPDATE symbols
        SET tick_size = 0.25, tick_value = 0.50
        WHERE LOWER(symbol) = 'mnq';
    END IF;
END
$$;