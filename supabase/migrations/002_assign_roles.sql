-- ============================================================================
-- LEAGUE OF STARS - BULK ROLE ASSIGNMENT (SCRIPT 2 OF 3)
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- ============================================================================

-- 1. SUPER ADMIN (Tarbiyah Director)
UPDATE profiles
SET role = 'super_admin'
WHERE email = 'moneeb.sarmad@bhaprep.org';

-- 2. ADMINS (Principals & Counselors)
UPDATE profiles
SET role = 'admin'
WHERE email IN (
  'leila.kayed@bhaprep.org',
  'smoussa@bhaprep.org',
  'bayanne.elkhatib@bhaprep.org',
  'sonya.badr@bhaprep.org',
  'einas.alabd@bhaprep.org',
  'sundus.khan@bhaprep.org'
);

-- 3. HOUSE MENTORS (with assigned houses)
UPDATE profiles
SET role = 'house_mentor', assigned_house = 'House of ʿUmar'
WHERE email = 'hanan.dabaja@bhaprep.org';

UPDATE profiles
SET role = 'house_mentor', assigned_house = 'House of Khadījah'
WHERE email = 'michelle.solis@bhaprep.org';

UPDATE profiles
SET role = 'house_mentor', assigned_house = 'House of ʿĀʾishah'
WHERE email = 'nora.hamed@bhaprep.org';

UPDATE profiles
SET role = 'house_mentor', assigned_house = 'House of Abū Bakr'
WHERE email = 'fauzan.plasticwala@bhaprep.org';

-- 4. TEACHERS (bulk assignment based on staff.role)
UPDATE profiles p
SET role = 'teacher'
FROM staff s
WHERE p.email = s.email
AND s.role = 'Teacher'
AND p.role IS NULL;

-- 5. SUPPORT STAFF (various non-teaching roles)
UPDATE profiles p
SET role = 'support_staff'
FROM staff s
WHERE p.email = s.email
AND s.role IN (
  'Librarian',
  'Athletic Director',
  'Adminstrative Assistant',
  'Administrative Assistant',
  'Lab Assistant',
  'Systems Administrator',
  'Finance Admin',
  'Registrar',
  'PR',
  'IT',
  'HR',
  'Facilities Director',
  'Office Manager',
  'Receptionist'
)
AND p.role IS NULL;

-- 6. DEFAULT: Assign remaining staff as teachers
UPDATE profiles p
SET role = 'teacher'
FROM staff s
WHERE p.email = s.email
AND p.role IS NULL;

-- ============================================================================
-- VERIFICATION: Run these queries to check role distribution
-- ============================================================================

-- Check role counts
SELECT role, COUNT(*) as count
FROM profiles
WHERE role IS NOT NULL
GROUP BY role
ORDER BY
  CASE role
    WHEN 'super_admin' THEN 1
    WHEN 'admin' THEN 2
    WHEN 'house_mentor' THEN 3
    WHEN 'teacher' THEN 4
    WHEN 'support_staff' THEN 5
  END;

-- Check house mentors have houses assigned
SELECT email, role, assigned_house
FROM profiles
WHERE role = 'house_mentor';

-- Check super admin
SELECT email, role
FROM profiles
WHERE role = 'super_admin';
