begin;

-- Clean slate for deterministic tests (local only)
truncate table
  merit_log,
  students,
  staff,
  admins,
  profiles,
  "3r_categories"
restart identity cascade;

-- 3R categories
insert into "3r_categories" (id, r, subcategory, points) values
  ('cat-respect', 'Respect', 'Polite Language & Manners', 10),
  ('cat-responsibility', 'Responsibility', 'Personal Accountability', 10),
  ('cat-righteousness', 'Righteousness', 'Prayer Etiquette', 15)
on conflict do nothing;

-- Profiles (match auth user ids created in tests)
insert into profiles (id, email, role, assigned_house, full_name)
values
  ('00000000-0000-0000-0000-000000000001', 'super_admin@example.test', 'super_admin', null, 'Super Admin'),
  ('00000000-0000-0000-0000-000000000002', 'admin@example.test', 'admin', null, 'Admin User'),
  ('00000000-0000-0000-0000-000000000003', 'teacher@example.test', 'teacher', null, 'Teacher User'),
  ('00000000-0000-0000-0000-000000000004', 'support@example.test', 'support_staff', null, 'Support Staff'),
  ('00000000-0000-0000-0000-000000000005', 'mentor@example.test', 'house_mentor', 'House of Abu Bakr', 'House Mentor'),
  ('00000000-0000-0000-0000-000000000006', 'student@example.test', 'student', null, 'Student User'),
  ('00000000-0000-0000-0000-000000000007', 'parent@example.test', 'parent', null, 'Parent User')
on conflict (id) do nothing;

-- Staff records (email link)
insert into staff (staff_name, email, house, grade_assignment)
values
  ('Teacher User', 'teacher@example.test', 'House of Abu Bakr', '6'),
  ('Support Staff', 'support@example.test', 'House of Umar', '7'),
  ('House Mentor', 'mentor@example.test', 'House of Abu Bakr', '6'),
  ('Admin User', 'admin@example.test', 'House of Khadijah', '8'),
  ('Super Admin', 'super_admin@example.test', 'House of Abu Bakr', 'All')
on conflict do nothing;

-- Students (handle optional student_id column)
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_name = 'students' and column_name = 'student_id'
  ) then
    insert into students (id, student_id, student_name, grade, section, house)
    values
      ('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Ali Hassan', 6, 'A', 'House of Abu Bakr'),
      ('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Fatima Noor', 6, 'B', 'House of Abu Bakr'),
      ('33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'Umar Khalid', 7, 'A', 'House of Umar'),
      ('44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 'Aisha Karim', 7, 'B', 'House of Umar'),
      ('55555555-5555-5555-5555-555555555555', '55555555-5555-5555-5555-555555555555', 'Khadija Saleh', 8, 'A', 'House of Khadijah'),
      ('66666666-6666-6666-6666-666666666666', '66666666-6666-6666-6666-666666666666', 'Maryam Zain', 8, 'B', 'House of Aishah')
    on conflict do nothing;
  else
    insert into students (id, student_name, grade, section, house)
    values
      ('11111111-1111-1111-1111-111111111111', 'Ali Hassan', 6, 'A', 'House of Abu Bakr'),
      ('22222222-2222-2222-2222-222222222222', 'Fatima Noor', 6, 'B', 'House of Abu Bakr'),
      ('33333333-3333-3333-3333-333333333333', 'Umar Khalid', 7, 'A', 'House of Umar'),
      ('44444444-4444-4444-4444-444444444444', 'Aisha Karim', 7, 'B', 'House of Umar'),
      ('55555555-5555-5555-5555-555555555555', 'Khadija Saleh', 8, 'A', 'House of Khadijah'),
      ('66666666-6666-6666-6666-666666666666', 'Maryam Zain', 8, 'B', 'House of Aishah')
    on conflict do nothing;
  end if;
end $$;

-- Merit log entries (deterministic standings + ties)
insert into merit_log (timestamp, date_of_event, student_name, grade, section, house, r, subcategory, points, notes, staff_name)
values
  (now(), '2026-01-01', 'Ali Hassan', 6, 'A', 'House of Abu Bakr', 'Respect', 'Polite Language & Manners', 10, 'Seed entry', 'Teacher User'),
  (now(), '2026-01-02', 'Ali Hassan', 6, 'A', 'House of Abu Bakr', 'Responsibility', 'Personal Accountability', 10, 'Seed entry', 'Teacher User'),
  (now(), '2026-01-03', 'Fatima Noor', 6, 'B', 'House of Abu Bakr', 'Righteousness', 'Prayer Etiquette', 20, 'Seed entry', 'Support Staff'),
  (now(), '2026-01-04', 'Umar Khalid', 7, 'A', 'House of Umar', 'Respect', 'Polite Language & Manners', 25, 'Seed entry', 'Teacher User'),
  (now(), '2026-01-05', 'Umar Khalid', 7, 'A', 'House of Umar', 'Responsibility', 'Personal Accountability', 15, 'Seed entry', 'House Mentor'),
  (now(), '2026-01-06', 'Aisha Karim', 7, 'B', 'House of Umar', 'Respect', 'Polite Language & Manners', 5, 'Seed entry', 'Teacher User'),
  (now(), '2026-01-07', 'Khadija Saleh', 8, 'A', 'House of Khadijah', 'Righteousness', 'Prayer Etiquette', 15, 'Seed entry', 'Teacher User'),
  (now(), '2026-01-07', 'Maryam Zain', 8, 'B', 'House of Aishah', 'Respect', 'Polite Language & Manners', 0, 'Seed entry', 'Teacher User'),
  (now(), '2026-01-08', null, null, null, 'House of Abu Bakr', 'House Competition', 'House Competition', 30, 'House competition award', 'Super Admin')
on conflict do nothing;

commit;
