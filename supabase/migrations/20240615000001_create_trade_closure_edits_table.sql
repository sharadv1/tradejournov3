-- Create the trade_closure_edits table to track changes to trade closures
CREATE TABLE IF NOT EXISTS trade_closure_edits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  closure_id UUID NOT NULL REFERENCES trade_closures(id) ON DELETE CASCADE,
  trade_id UUID NOT NULL,
  previous_close_price DECIMAL(10, 2),
  previous_closed_position_size DECIMAL(10, 2),
  new_close_price DECIMAL(10, 2) NOT NULL,
  new_closed_position_size DECIMAL(10, 2) NOT NULL,
  edit_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create an index on the closure_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_trade_closure_edits_closure_id ON trade_closure_edits(closure_id);

-- Enable realtime for the trade_closure_edits table
ALTER PUBLICATION supabase_realtime ADD TABLE trade_closure_edits;