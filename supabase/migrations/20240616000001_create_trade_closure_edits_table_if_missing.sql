-- Create trade_closure_edits table if it doesn't exist
CREATE TABLE IF NOT EXISTS trade_closure_edits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  closure_id UUID NOT NULL REFERENCES trade_closures(id) ON DELETE CASCADE,
  trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  previous_close_price NUMERIC NOT NULL,
  previous_closed_position_size NUMERIC NOT NULL,
  new_close_price NUMERIC NOT NULL,
  new_closed_position_size NUMERIC NOT NULL,
  edit_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add realtime support
ALTER PUBLICATION supabase_realtime ADD TABLE trade_closure_edits;
