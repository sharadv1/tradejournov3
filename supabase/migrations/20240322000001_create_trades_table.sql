-- Create trades table if it doesn't exist
CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  symbol TEXT NOT NULL,
  direction TEXT NOT NULL,
  entry_price DECIMAL NOT NULL,
  exit_price DECIMAL,
  position_size DECIMAL NOT NULL,
  position_size_closed DECIMAL,
  remaining_size DECIMAL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  notes TEXT,
  market_type TEXT NOT NULL,
  initial_stop_loss DECIMAL,
  current_stop_loss DECIMAL,
  take_profit DECIMAL,
  risk_reward_ratio TEXT,
  risk_amount DECIMAL,
  reward_amount DECIMAL,
  risk_formula TEXT,
  reward_formula TEXT,
  highest_price DECIMAL,
  lowest_price DECIMAL,
  timeframe TEXT,
  trade_type TEXT,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable realtime
alter publication supabase_realtime add table trades;
