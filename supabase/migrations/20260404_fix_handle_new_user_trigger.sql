-- Fix handle_new_user trigger to include whatsapp from user metadata.
-- Previously only inserted (id, name), leaving whatsapp NULL.
-- Email signup passes whatsapp in raw_user_meta_data via signUp({ options: { data: { whatsapp } } }).
--
-- Also adds INSERT RLS policy so ProtectedRoute can auto-repair orphaned profiles.
-- Without this, upsert from the client fails on the INSERT path (only SELECT + UPDATE existed).
--
-- Run in Supabase SQL Editor (Dashboard → SQL Editor) with service role.

-- 1. Fix the trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, whatsapp)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data ->> 'whatsapp', NULL)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Add INSERT policy (users can only insert their own profile row)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users can insert own profile'
      AND tablename = 'profiles'
  ) THEN
    CREATE POLICY "Users can insert own profile"
      ON public.profiles
      FOR INSERT
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;
