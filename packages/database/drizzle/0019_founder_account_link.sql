-- Migration 0019: link the founder's real sign-in account to the platform records.
-- 0016 marks stokrova1@gmail.com as platform admin, but it cannot create the sign-in account
-- (no password), and if the account did not exist yet it stored a placeholder user id.
-- Once the founder account is created in Authentication (with a password), this makes the
-- platform record point at the real account. It never blocks a sign-up.

CREATE OR REPLACE FUNCTION public.handle_platform_admin_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF LOWER(NEW.email) = 'stokrova1@gmail.com' THEN
    BEGIN
      UPDATE public.users
         SET id = NEW.id::text, is_active = true, updated_at = NOW()
       WHERE id = 'f145cbc0-65be-4903-ad5e-28562ef44a0f'
         AND LOWER(email) = 'stokrova1@gmail.com';
      IF NOT FOUND THEN
        INSERT INTO public.users (id, tenant_id, email, password_hash, full_name, role, is_active, created_at, updated_at)
        VALUES (NEW.id::text, 'ten_platform_root', 'stokrova1@gmail.com', 'AUTH_MANAGED_BY_SUPABASE',
                'STOKROVA Platform Founder', 'PLATFORM_SUPER_ADMIN', true, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'founder link skipped: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_platform_admin_link ON auth.users;
CREATE TRIGGER on_auth_user_platform_admin_link
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_platform_admin_link();

-- If the founder account already exists, make sure it is marked and linked now.
UPDATE auth.users
   SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"is_platform_admin": true, "role": "PLATFORM_SUPER_ADMIN"}'::jsonb
 WHERE LOWER(email) = 'stokrova1@gmail.com';

DO $$
DECLARE v_id text;
BEGIN
  SELECT id::text INTO v_id FROM auth.users WHERE LOWER(email) = 'stokrova1@gmail.com' LIMIT 1;
  IF v_id IS NOT NULL THEN
    UPDATE public.users SET id = v_id, updated_at = NOW()
     WHERE id = 'f145cbc0-65be-4903-ad5e-28562ef44a0f' AND LOWER(email) = 'stokrova1@gmail.com';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'founder link skipped: %', SQLERRM;
END $$;
