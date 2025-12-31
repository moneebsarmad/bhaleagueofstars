-- ============================================================================
-- LEAGUE OF STARS - RBAC SYSTEM MIGRATION (SCRIPT 1 OF 3)
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- ============================================================================

-- 1. CREATE ROLES TABLE
CREATE TABLE IF NOT EXISTS roles (
  role_name TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  priority INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO roles (role_name, description, priority) VALUES
('super_admin', 'Ultimate system access - Tarbiyah Director only', 1),
('admin', 'Full access to all students and analytics - Principals & Counselors', 2),
('house_mentor', 'Can view analytics and students for assigned house only', 3),
('teacher', 'Can award/deduct points, basic view access', 4),
('support_staff', 'Can award/deduct points, basic view access', 5)
ON CONFLICT (role_name) DO NOTHING;

-- 2. CREATE PERMISSIONS TABLE
CREATE TABLE IF NOT EXISTS permissions (
  permission_name TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO permissions (permission_name, description, category) VALUES
('points.award', 'Can award positive points to students', 'points'),
('points.deduct', 'Can deduct points from students', 'points'),
('points.view_all', 'Can view all point transactions across all students', 'points'),
('analytics.view_all', 'Can view all analytics dashboards and reports', 'analytics'),
('analytics.view_house', 'Can view analytics for assigned house only', 'analytics'),
('students.view_all', 'Can view all student data and profiles', 'students'),
('students.view_house', 'Can view students in assigned house only', 'students'),
('reports.export_all', 'Can export all reports and data', 'reports'),
('reports.export_house', 'Can export reports for assigned house only', 'reports'),
('staff.manage', 'Can create, edit, and deactivate staff accounts', 'admin'),
('system.configure', 'Can modify system settings and configurations', 'admin'),
('audit.view', 'Can view audit logs and system activity', 'admin')
ON CONFLICT (permission_name) DO NOTHING;

-- 3. CREATE ROLE_PERMISSIONS JUNCTION TABLE
CREATE TABLE IF NOT EXISTS role_permissions (
  role_name TEXT REFERENCES roles(role_name) ON DELETE CASCADE,
  permission_name TEXT REFERENCES permissions(permission_name) ON DELETE CASCADE,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (role_name, permission_name)
);

INSERT INTO role_permissions (role_name, permission_name) VALUES
-- SUPER ADMIN (all permissions)
('super_admin', 'points.award'),
('super_admin', 'points.deduct'),
('super_admin', 'points.view_all'),
('super_admin', 'analytics.view_all'),
('super_admin', 'students.view_all'),
('super_admin', 'reports.export_all'),
('super_admin', 'staff.manage'),
('super_admin', 'system.configure'),
('super_admin', 'audit.view'),
-- ADMIN (full access except system config)
('admin', 'points.award'),
('admin', 'points.deduct'),
('admin', 'points.view_all'),
('admin', 'analytics.view_all'),
('admin', 'students.view_all'),
('admin', 'reports.export_all'),
-- HOUSE MENTOR (house-scoped access)
('house_mentor', 'points.award'),
('house_mentor', 'points.deduct'),
('house_mentor', 'analytics.view_house'),
('house_mentor', 'students.view_house'),
('house_mentor', 'reports.export_house'),
-- TEACHER (points only)
('teacher', 'points.award'),
('teacher', 'points.deduct'),
-- SUPPORT STAFF (points only)
('support_staff', 'points.award'),
('support_staff', 'points.deduct')
ON CONFLICT (role_name, permission_name) DO NOTHING;

-- 4. UPDATE PROFILES TABLE WITH RBAC COLUMNS
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS role TEXT REFERENCES roles(role_name),
ADD COLUMN IF NOT EXISTS assigned_house TEXT,
ADD COLUMN IF NOT EXISTS staff_id UUID,
ADD COLUMN IF NOT EXISTS admin_id UUID;

-- Add foreign key constraints if staff/admins tables exist
DO $$
BEGIN
  -- Try to add staff_id FK
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff') THEN
    BEGIN
      ALTER TABLE profiles ADD CONSTRAINT fk_profiles_staff
        FOREIGN KEY (staff_id) REFERENCES staff(id);
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;

  -- Try to add admin_id FK
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admins') THEN
    BEGIN
      ALTER TABLE profiles ADD CONSTRAINT fk_profiles_admin
        FOREIGN KEY (admin_id) REFERENCES admins(id);
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_staff_id ON profiles(staff_id);
CREATE INDEX IF NOT EXISTS idx_profiles_admin_id ON profiles(admin_id);
CREATE INDEX IF NOT EXISTS idx_profiles_assigned_house ON profiles(assigned_house);

-- 5. CREATE HELPER FUNCTIONS

-- Check if user has a specific permission
CREATE OR REPLACE FUNCTION has_permission(user_id UUID, perm TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles p
    JOIN role_permissions rp ON p.role = rp.role_name
    WHERE p.id = user_id
    AND rp.permission_name = perm
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's assigned house
CREATE OR REPLACE FUNCTION get_user_house(user_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT assigned_house
    FROM profiles
    WHERE id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get all permissions for a user
CREATE OR REPLACE FUNCTION get_user_permissions(user_id UUID)
RETURNS TABLE(permission_name TEXT, description TEXT, category TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT p.permission_name, p.description, p.category
  FROM profiles prof
  JOIN role_permissions rp ON prof.role = rp.role_name
  JOIN permissions p ON rp.permission_name = p.permission_name
  WHERE prof.id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's role
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role
    FROM profiles
    WHERE id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's staff name (for merit_log matching)
CREATE OR REPLACE FUNCTION get_user_staff_name(user_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT s.staff_name
    FROM profiles p
    JOIN staff s ON p.staff_id = s.id
    WHERE p.id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. LINK EXISTING PROFILES TO STAFF/ADMINS
UPDATE profiles p
SET staff_id = s.id
FROM staff s
WHERE p.email = s.email
AND p.staff_id IS NULL;

UPDATE profiles p
SET admin_id = a.id
FROM admins a
WHERE p.email = a.email
AND p.admin_id IS NULL;

-- 7. CREATE AUDIT LOG TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id TEXT,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- ============================================================================
-- VERIFICATION: Run this query to confirm tables were created
-- ============================================================================
-- SELECT table_name FROM information_schema.tables
-- WHERE table_name IN ('roles', 'permissions', 'role_permissions', 'audit_logs');
