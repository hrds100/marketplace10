-- Copy email from auth.users into profiles on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, whatsapp)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'whatsapp', NULL)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill: copy email from auth.users to profiles for all existing users missing email
UPDATE public.profiles
SET email = au.email
FROM auth.users au
WHERE profiles.id = au.id
AND (profiles.email IS NULL OR profiles.email = '');
