-- Create accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create strategies table
CREATE TABLE IF NOT EXISTS strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create symbols table
CREATE TABLE IF NOT EXISTS symbols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  tick_size DECIMAL,
  tick_value DECIMAL,
  contract_size DECIMAL,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create trades table
CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  trade_type TEXT NOT NULL,
  entry_price DECIMAL NOT NULL,
  exit_price DECIMAL,
  position_size DECIMAL NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  notes TEXT,
  market_type TEXT NOT NULL,
  direction TEXT NOT NULL,
  max_risk_per_trade DECIMAL,
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
  psp_time TIME,
  ssmt_quarter TEXT,
  trade_grade TEXT,
  account_id UUID REFERENCES accounts(id),
  strategy_id UUID REFERENCES strategies(id),
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create media_files table for trade images
CREATE TABLE IF NOT EXISTS media_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID REFERENCES trades(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable row level security
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE symbols ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own accounts" ON accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own accounts" ON accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own accounts" ON accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own accounts" ON accounts
  FOR DELETE USING (auth.uid() = user_id);

-- Repeat for strategies
CREATE POLICY "Users can view their own strategies" ON strategies
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own strategies" ON strategies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own strategies" ON strategies
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own strategies" ON strategies
  FOR DELETE USING (auth.uid() = user_id);

-- Repeat for symbols
CREATE POLICY "Users can view their own symbols" ON symbols
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own symbols" ON symbols
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own symbols" ON symbols
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own symbols" ON symbols
  FOR DELETE USING (auth.uid() = user_id);

-- Repeat for trades
CREATE POLICY "Users can view their own trades" ON trades
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trades" ON trades
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trades" ON trades
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trades" ON trades
  FOR DELETE USING (auth.uid() = user_id);

-- Repeat for media_files (based on trade ownership)
CREATE POLICY "Users can view their own media files" ON media_files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trades
      WHERE trades.id = media_files.trade_id
      AND trades.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own media files" ON media_files
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM trades
      WHERE trades.id = media_files.trade_id
      AND trades.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own media files" ON media_files
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM trades
      WHERE trades.id = media_files.trade_id
      AND trades.user_id = auth.uid()
    )
  );

-- Enable realtime for all tables
alter publication supabase_realtime add table accounts;
alter publication supabase_realtime add table strategies;
alter publication supabase_realtime add table symbols;
alter publication supabase_realtime add table trades;
alter publication supabase_realtime add table media_files;