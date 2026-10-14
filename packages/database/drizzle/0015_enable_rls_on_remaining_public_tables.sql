-- Migration 0015: Enable Row Level Security (RLS) on remaining public tables
-- Fixes Supabase linter error 0013_rls_disabled_in_public for:
-- 1. public.permissions
-- 2. public.role_permissions
-- 3. public.user_profiles

-- 1. Table: public.permissions (Global System Permissions Catalog)
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "permissions_select_policy" ON public.permissions;
CREATE POLICY "permissions_select_policy" ON public.permissions
AS PERMISSIVE FOR SELECT TO authenticated, anon, public
USING (true);

DROP POLICY IF EXISTS "permissions_admin_write_policy" ON public.permissions;
CREATE POLICY "permissions_admin_write_policy" ON public.permissions
AS PERMISSIVE FOR ALL TO authenticated, anon, public
USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true')
WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true');

GRANT SELECT ON public.permissions TO authenticated, anon;
GRANT ALL ON public.permissions TO authenticated;


-- 2. Table: public.role_permissions (Association between Roles and Permissions)
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "role_permissions_tenant_isolation" ON public.role_permissions;
CREATE POLICY "role_permissions_tenant_isolation" ON public.role_permissions
AS PERMISSIVE FOR ALL TO authenticated, anon, public
USING (
  NULLIF(current_setting('app.is_platform_admin', true), '') = 'true'
  OR EXISTS (
    SELECT 1 FROM public.roles r
    WHERE r.id = role_permissions.role_id
    AND (
      r.tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
      OR r.tenant_id IS NULL
    )
  )
)
WITH CHECK (
  NULLIF(current_setting('app.is_platform_admin', true), '') = 'true'
  OR EXISTS (
    SELECT 1 FROM public.roles r
    WHERE r.id = role_permissions.role_id
    AND r.tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  )
);

GRANT ALL ON public.role_permissions TO authenticated, anon;


-- 3. Table: public.user_profiles (User Profiles scoped via users.tenant_id)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_profiles_tenant_isolation" ON public.user_profiles;
CREATE POLICY "user_profiles_tenant_isolation" ON public.user_profiles
AS PERMISSIVE FOR ALL TO authenticated, anon, public
USING (
  NULLIF(current_setting('app.is_platform_admin', true), '') = 'true'
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = user_profiles.user_id
    AND u.tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  )
)
WITH CHECK (
  NULLIF(current_setting('app.is_platform_admin', true), '') = 'true'
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = user_profiles.user_id
    AND u.tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  )
);

GRANT ALL ON public.user_profiles TO authenticated, anon;
