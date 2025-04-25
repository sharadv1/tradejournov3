CREATE TABLE IF NOT EXISTS journal_subentries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  day_of_week TEXT NOT NULL,
  plan TEXT,
  review TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS has_subentries BOOLEAN DEFAULT FALSE;

alter publication supabase_realtime add table journal_subentries;
