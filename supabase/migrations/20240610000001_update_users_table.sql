-- Update the users table to ensure it has the correct structure for authentication

-- First, make sure the users table exists
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable row level security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policies for the users table
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
CREATE POLICY "Users can view their own data"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
CREATE POLICY "Users can update their own data"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- Update foreign key constraints on other tables
ALTER TABLE IF EXISTS public.accounts
  DROP CONSTRAINT IF EXISTS accounts_user_id_fkey,
  ADD CONSTRAINT accounts_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.users(id)
  ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.strategies
  DROP CONSTRAINT IF EXISTS strategies_user_id_fkey,
  ADD CONSTRAINT strategies_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.users(id)
  ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.symbols
  DROP CONSTRAINT IF EXISTS symbols_user_id_fkey,
  ADD CONSTRAINT symbols_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.users(id)
  ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.trades
  DROP CONSTRAINT IF EXISTS trades_user_id_fkey,
  ADD CONSTRAINT trades_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.users(id)
  ON DELETE CASCADE;

-- Add realtime support
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
