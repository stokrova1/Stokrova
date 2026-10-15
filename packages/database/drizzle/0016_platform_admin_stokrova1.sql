-- Migration 0016: Platform Admin Authorization & Sovereign Anchor for stokrova1@gmail.com
-- Sets up permanent platform administrator claims in Supabase auth and sovereign root tenant in public schema.

-- 1. Create or replace trigger function to guarantee permanent admin sync on auth.users
CREATE OR REPLACE FUNCTION public.handle_platform_admin_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF LOWER(NEW.email) = 'stokrova1@gmail.com' THEN
    NEW.raw_app_meta_data := COALESCE(NEW.raw_app_meta_data, '{}'::jsonb) || '{"is_platform_admin": true, "role": "PLATFORM_SUPER_ADMIN"}'::jsonb;
    NEW.raw_user_meta_data := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb) || '{"is_platform_admin": true, "role": "PLATFORM_SUPER_ADMIN", "full_name": "STOKROVA Platform Founder"}'::jsonb;
    NEW.is_super_admin := true;
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Attach trigger to auth.users (runs before insert or update)
DROP TRIGGER IF EXISTS on_auth_user_platform_admin_sync ON auth.users;
CREATE TRIGGER on_auth_user_platform_admin_sync
BEFORE INSERT OR UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_platform_admin_sync();

-- 3. Update existing auth.users entry for stokrova1@gmail.com
UPDATE auth.users
SET
  raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"is_platform_admin": true, "role": "PLATFORM_SUPER_ADMIN"}'::jsonb,
  raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"is_platform_admin": true, "role": "PLATFORM_SUPER_ADMIN", "full_name": "STOKROVA Platform Founder"}'::jsonb,
  is_super_admin = true
WHERE LOWER(email) = 'stokrova1@gmail.com';

-- 4. Sovereign Root Platform Management Tenant in public.tenants
INSERT INTO public.tenants (id, name, slug, status, created_at, updated_at)
VALUES ('ten_platform_root', 'STOKROVA Global Platform Management', 'stokrova-root', 'ACTIVE', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  status = 'ACTIVE',
  updated_at = NOW();

-- 5. Global System Role Template for Platform Super Admin
INSERT INTO public.roles (id, tenant_id, name, code, description, is_system_template, created_at)
VALUES (
  'role_tmpl_platform_super_admin',
  NULL,
  'Platform Super Admin',
  'PLATFORM_SUPER_ADMIN',
  'Global Sovereign Platform Root Administrator',
  true,
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  is_system_template = true;

-- 6. Insert/Upsert public.users for stokrova1@gmail.com
DO $$
DECLARE
  v_auth_user_id text;
BEGIN
  SELECT id::text INTO v_auth_user_id FROM auth.users WHERE LOWER(email) = 'stokrova1@gmail.com' LIMIT 1;
  IF v_auth_user_id IS NULL THEN
    v_auth_user_id := 'f145cbc0-65be-4903-ad5e-28562ef44a0f';
  END IF;

  INSERT INTO public.users (
    id, tenant_id, email, password_hash, full_name, role, is_active, created_at, updated_at
  )
  VALUES (
    v_auth_user_id,
    'ten_platform_root',
    'stokrova1@gmail.com',
    'AUTH_MANAGED_BY_SUPABASE',
    'STOKROVA Platform Founder',
    'PLATFORM_SUPER_ADMIN',
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    tenant_id = EXCLUDED.tenant_id,
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    is_active = true,
    updated_at = NOW();

  -- 7. User Profile
  INSERT INTO public.user_profiles (id, user_id, display_name, locale, timezone, created_at, updated_at)
  VALUES ('uprof_platform_root', v_auth_user_id, 'Platform Founder', 'en', 'UTC', NOW(), NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    updated_at = NOW();

  -- 8. Root Membership
  INSERT INTO public.memberships (id, tenant_id, user_id, status, created_at)
  VALUES ('mem_platform_root', 'ten_platform_root', v_auth_user_id, 'ACTIVE', NOW())
  ON CONFLICT (tenant_id, user_id) DO UPDATE SET
    status = 'ACTIVE';

  -- 9. Role Assignment
  INSERT INTO public.role_assignments (id, tenant_id, user_id, role_id, created_at)
  VALUES ('ra_platform_root', 'ten_platform_root', v_auth_user_id, 'role_tmpl_platform_super_admin', NOW())
  ON CONFLICT (id) DO UPDATE SET
    role_id = EXCLUDED.role_id;
END;
$$;
