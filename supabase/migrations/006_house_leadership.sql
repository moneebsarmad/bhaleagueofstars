-- ============================================================================
-- LEAGUE OF STARS - HOUSE LEADERSHIP APP SUPPORT
-- ============================================================================

-- House leadership assignments
CREATE TABLE IF NOT EXISTS house_leadership (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('mentor', 'captain', 'vice_captain')),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS house_leadership_unique
  ON house_leadership (house, role, user_id);

-- House events / challenges
CREATE TABLE IF NOT EXISTS house_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'active',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- House announcements (placeholder, future use)
CREATE TABLE IF NOT EXISTS house_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  pinned BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Helper function: check if user is a house leader for a house
CREATE OR REPLACE FUNCTION is_house_leader(user_id UUID, house_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM house_leadership hl
    WHERE hl.user_id = user_id
      AND hl.house = house_name
      AND hl.active = TRUE
  );
$$;

-- Helper function: check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin_user(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id AND role = 'super_admin'
  );
$$;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE house_leadership ENABLE ROW LEVEL SECURITY;
ALTER TABLE house_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE house_announcements ENABLE ROW LEVEL SECURITY;

-- House leadership: users can view their own, super admin can view all
DROP POLICY IF EXISTS "House leadership read own" ON house_leadership;
DROP POLICY IF EXISTS "House leadership read house" ON house_leadership;
DROP POLICY IF EXISTS "House leadership super admin all" ON house_leadership;
DROP POLICY IF EXISTS "House leadership super admin manage" ON house_leadership;

CREATE POLICY "House leadership read own"
ON house_leadership FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "House leadership read house"
ON house_leadership FOR SELECT
USING (
  is_super_admin_user(auth.uid())
  OR is_house_leader(auth.uid(), house)
);

CREATE POLICY "House leadership super admin all"
ON house_leadership FOR SELECT
USING (is_super_admin_user(auth.uid()));

CREATE POLICY "House leadership super admin manage"
ON house_leadership FOR ALL
USING (is_super_admin_user(auth.uid()))
WITH CHECK (is_super_admin_user(auth.uid()));

-- House events: house leaders can read/write for their house, super admin all
DROP POLICY IF EXISTS "House events read house" ON house_events;
DROP POLICY IF EXISTS "House events manage house" ON house_events;
DROP POLICY IF EXISTS "House events super admin all" ON house_events;

CREATE POLICY "House events read house"
ON house_events FOR SELECT
USING (is_super_admin_user(auth.uid()) OR is_house_leader(auth.uid(), house));

CREATE POLICY "House events manage house"
ON house_events FOR ALL
USING (is_super_admin_user(auth.uid()) OR is_house_leader(auth.uid(), house))
WITH CHECK (is_super_admin_user(auth.uid()) OR is_house_leader(auth.uid(), house));

-- House announcements: house leaders can read/write for their house, super admin all
DROP POLICY IF EXISTS "House announcements read house" ON house_announcements;
DROP POLICY IF EXISTS "House announcements manage house" ON house_announcements;
DROP POLICY IF EXISTS "House announcements super admin all" ON house_announcements;

CREATE POLICY "House announcements read house"
ON house_announcements FOR SELECT
USING (is_super_admin_user(auth.uid()) OR is_house_leader(auth.uid(), house));

CREATE POLICY "House announcements manage house"
ON house_announcements FOR ALL
USING (is_super_admin_user(auth.uid()) OR is_house_leader(auth.uid(), house))
WITH CHECK (is_super_admin_user(auth.uid()) OR is_house_leader(auth.uid(), house));

-- Allow house leaders to view students in their house
DROP POLICY IF EXISTS "House leaders can view students in house" ON students;
CREATE POLICY "House leaders can view students in house"
ON students FOR SELECT
USING (
  is_super_admin_user(auth.uid())
  OR is_house_leader(auth.uid(), house)
  OR has_permission(auth.uid(), 'students.view_all')
  OR (has_permission(auth.uid(), 'students.view_house') AND house = get_user_house(auth.uid()))
  OR has_permission(auth.uid(), 'points.award')
);

-- Allow house leaders to view merit entries for their house
DROP POLICY IF EXISTS "House leaders can view merit in house" ON merit_log;
CREATE POLICY "House leaders can view merit in house"
ON merit_log FOR SELECT
USING (
  is_super_admin_user(auth.uid())
  OR is_house_leader(auth.uid(), house)
  OR has_permission(auth.uid(), 'points.view_all')
  OR (has_permission(auth.uid(), 'analytics.view_house') AND house = get_user_house(auth.uid()))
  OR (staff_name = get_user_staff_name(auth.uid()))
  OR has_permission(auth.uid(), 'points.award')
);
