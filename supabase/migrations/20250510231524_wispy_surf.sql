/*
  # Fix users table and trigger function

  1. Changes
    - Drop and recreate users table with proper constraints
    - Update trigger function to handle email case sensitivity
    - Add proper indexes for performance
    - Ensure trigger is properly set up

  2. Security
    - Maintain existing RLS policies
    - Keep security definer on trigger function
*/

-- First drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate users table with proper constraints
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users (email);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Recreate policies
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can read email of library sharers" ON users;

CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can read email of library sharers"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM shared_library_permissions 
      WHERE (shared_library_permissions.shared_by = users.id AND shared_library_permissions.shared_with = auth.uid())
      OR (shared_library_permissions.shared_with = users.id AND shared_library_permissions.shared_by = auth.uid())
    )
  );

-- Create improved trigger function that handles email case sensitivity
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (
    NEW.id,
    LOWER(NEW.email) -- Store email in lowercase for consistent lookups
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing users if needed
INSERT INTO public.users (id, email)
SELECT id, email 
FROM auth.users
ON CONFLICT (id) DO NOTHING;