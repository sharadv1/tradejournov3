-- Create journal entries table
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  entry_type VARCHAR(10) NOT NULL CHECK (entry_type IN ('daily', 'weekly', 'monthly')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  plan TEXT,
  review TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS journal_entries_user_id_idx ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS journal_entries_date_range_idx ON journal_entries(start_date, end_date);

-- Enable row level security
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

-- Create policies for journal entries
DROP POLICY IF EXISTS "Users can view their own journal entries" ON journal_entries;
CREATE POLICY "Users can view their own journal entries"
  ON journal_entries FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own journal entries" ON journal_entries;
CREATE POLICY "Users can insert their own journal entries"
  ON journal_entries FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own journal entries" ON journal_entries;
CREATE POLICY "Users can update their own journal entries"
  ON journal_entries FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own journal entries" ON journal_entries;
CREATE POLICY "Users can delete their own journal entries"
  ON journal_entries FOR DELETE
  USING (user_id = auth.uid());

-- Add to realtime publication
alter publication supabase_realtime add table journal_entries;
