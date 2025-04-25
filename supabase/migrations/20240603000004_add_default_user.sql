-- Create a default user for testing purposes
INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-000000000000', 'default@example.com')
ON CONFLICT (id) DO NOTHING;

-- Create corresponding public.users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT
);

-- Create corresponding public.users record
INSERT INTO public.users (id, email)
VALUES ('00000000-0000-0000-0000-000000000000', 'default@example.com')
ON CONFLICT (id) DO NOTHING;
