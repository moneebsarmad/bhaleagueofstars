-- ============================================================================
-- LEAGUE OF STARS - FIX RLS POLICIES (SCRIPT 4)
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- ============================================================================

-- 1. Create helper function to check if user is admin (avoids recursive query)
CREATE OR REPLACE FUNCTION is_elevated_role(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = user_id
    AND role IN ('super_admin', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix profiles table RLS - replace recursive policy with function call
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
USING (is_elevated_role(auth.uid()));

-- 3. Fix staff table RLS - use case-insensitive email comparison
DROP POLICY IF EXISTS "Staff can view own record" ON staff;

CREATE POLICY "Staff can view own record"
ON staff FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND LOWER(profiles.email) = LOWER(staff.email)
  )
);

-- 4. Verify policies
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('profiles', 'staff')
ORDER BY tablename, policyname;
