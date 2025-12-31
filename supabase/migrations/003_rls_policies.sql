-- ============================================================================
-- LEAGUE OF STARS - RLS POLICIES (SCRIPT 3 OF 3)
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- ============================================================================

-- ============================================================================
-- PROFILES TABLE RLS
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Admins and super admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'admin')
  )
);

-- Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ============================================================================
-- STAFF TABLE RLS
-- ============================================================================
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view own record" ON staff;
DROP POLICY IF EXISTS "Admins can view all staff" ON staff;
DROP POLICY IF EXISTS "Staff manage permission can modify staff" ON staff;

-- Staff can view their own record
CREATE POLICY "Staff can view own record"
ON staff FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.staff_id = staff.id
  )
);

-- Anyone with points.award permission can view staff (needed for lookups)
CREATE POLICY "Point awarders can view staff"
ON staff FOR SELECT
USING (has_permission(auth.uid(), 'points.award'));

-- Super admin can manage staff
CREATE POLICY "Staff manage permission can modify staff"
ON staff FOR ALL
USING (has_permission(auth.uid(), 'staff.manage'))
WITH CHECK (has_permission(auth.uid(), 'staff.manage'));

-- ============================================================================
-- ADMINS TABLE RLS
-- ============================================================================
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view own record" ON admins;
DROP POLICY IF EXISTS "Super admin can view all admins" ON admins;

-- Admins can view their own record
CREATE POLICY "Admins can view own record"
ON admins FOR SELECT
USING (auth_user_id = auth.uid());

-- Super admin can view all admins
CREATE POLICY "Super admin can view all admins"
ON admins FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'super_admin'
  )
);

-- Super admin can manage admins
CREATE POLICY "Super admin can manage admins"
ON admins FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'super_admin'
  )
);

-- ============================================================================
-- STUDENTS TABLE RLS
-- ============================================================================
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Can view students based on role" ON students;
DROP POLICY IF EXISTS "Can insert students with permission" ON students;
DROP POLICY IF EXISTS "Can update students with permission" ON students;
DROP POLICY IF EXISTS "Can delete students with permission" ON students;

-- View students: admins see all, house mentors see their house, others with point permissions see all (for awarding)
CREATE POLICY "Can view students based on role"
ON students FOR SELECT
USING (
  -- Admins can view all
  has_permission(auth.uid(), 'students.view_all')
  OR
  -- House mentors can view their house
  (
    has_permission(auth.uid(), 'students.view_house')
    AND house = get_user_house(auth.uid())
  )
  OR
  -- Anyone who can award points needs to see students
  has_permission(auth.uid(), 'points.award')
);

-- Only admins can insert students
CREATE POLICY "Can insert students with permission"
ON students FOR INSERT
WITH CHECK (
  has_permission(auth.uid(), 'staff.manage')
  OR has_permission(auth.uid(), 'system.configure')
);

-- Only admins can update students
CREATE POLICY "Can update students with permission"
ON students FOR UPDATE
USING (has_permission(auth.uid(), 'students.view_all'))
WITH CHECK (has_permission(auth.uid(), 'students.view_all'));

-- Only super admin can delete students
CREATE POLICY "Can delete students with permission"
ON students FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'super_admin'
  )
);

-- ============================================================================
-- MERIT_LOG TABLE RLS
-- ============================================================================
ALTER TABLE merit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Can insert merit with permission" ON merit_log;
DROP POLICY IF EXISTS "Can view merit based on role" ON merit_log;
DROP POLICY IF EXISTS "Can update merit with permission" ON merit_log;
DROP POLICY IF EXISTS "Can delete merit with permission" ON merit_log;

-- Insert: anyone with points.award can add positive, points.deduct for negative
CREATE POLICY "Can insert merit with permission"
ON merit_log FOR INSERT
WITH CHECK (
  (points > 0 AND has_permission(auth.uid(), 'points.award'))
  OR
  (points < 0 AND has_permission(auth.uid(), 'points.deduct'))
  OR
  (points = 0 AND has_permission(auth.uid(), 'points.award'))
);

-- View: admins see all, house mentors see their house, staff see their own entries
CREATE POLICY "Can view merit based on role"
ON merit_log FOR SELECT
USING (
  -- Admins can view all
  has_permission(auth.uid(), 'points.view_all')
  OR
  -- House mentors can view their house's entries
  (
    has_permission(auth.uid(), 'analytics.view_house')
    AND house = get_user_house(auth.uid())
  )
  OR
  -- Staff can view entries they created
  (
    staff_name = get_user_staff_name(auth.uid())
  )
  OR
  -- Anyone with point permissions can view (for leaderboard/dashboard)
  has_permission(auth.uid(), 'points.award')
);

-- Update: only admins can update
CREATE POLICY "Can update merit with permission"
ON merit_log FOR UPDATE
USING (has_permission(auth.uid(), 'points.view_all'))
WITH CHECK (has_permission(auth.uid(), 'points.view_all'));

-- Delete: only super admin can delete
CREATE POLICY "Can delete merit with permission"
ON merit_log FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'super_admin'
  )
);

-- ============================================================================
-- AUDIT_LOGS TABLE RLS
-- ============================================================================
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Can view audit logs with permission" ON audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;

-- Only users with audit.view permission can read
CREATE POLICY "Can view audit logs with permission"
ON audit_logs FOR SELECT
USING (has_permission(auth.uid(), 'audit.view'));

-- Allow inserts for logging (typically done by triggers/functions)
CREATE POLICY "System can insert audit logs"
ON audit_logs FOR INSERT
WITH CHECK (true);

-- ============================================================================
-- 3R_CATEGORIES TABLE RLS (for point categories)
-- ============================================================================
ALTER TABLE "3r_categories" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view categories" ON "3r_categories";
DROP POLICY IF EXISTS "Admins can manage categories" ON "3r_categories";

-- Anyone authenticated can view categories
CREATE POLICY "Anyone can view categories"
ON "3r_categories" FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only admins can manage categories
CREATE POLICY "Admins can manage categories"
ON "3r_categories" FOR ALL
USING (has_permission(auth.uid(), 'system.configure'))
WITH CHECK (has_permission(auth.uid(), 'system.configure'));

-- ============================================================================
-- VERIFICATION: Check RLS is enabled
-- ============================================================================
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'staff', 'admins', 'students', 'merit_log', 'audit_logs', '3r_categories');
