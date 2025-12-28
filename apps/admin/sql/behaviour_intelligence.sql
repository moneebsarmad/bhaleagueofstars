create extension if not exists "pgcrypto";

create table public.behaviour_events (
  event_id uuid primary key default gen_random_uuid(),

  student_id uuid not null,
  student_name text,
  grade int,
  section text,

  event_type text check (event_type in ('merit', 'demerit')) not null,

  event_date date not null,
  event_time time,

  staff_id uuid,
  staff_name text,

  class_context text,
  location text,

  category text,
  subcategory text,

  severity text check (severity in ('minor','moderate','major')),
  points int not null,

  notes text,

  source_system text,
  source_upload_id uuid,

  created_at timestamp with time zone default now()
);

create table public.behaviour_uploads (
  upload_id uuid primary key default gen_random_uuid(),

  uploaded_by uuid,
  source_system text,
  file_name text,

  upload_type text check (upload_type in ('append','replace_range','replace_all')),
  date_range_start date,
  date_range_end date,

  created_at timestamp with time zone default now()
);

create table public.student_behaviour_insights (
  student_id uuid not null,
  time_window text check (time_window in ('7d','30d')),

  total_merits int default 0,
  total_demerits int default 0,
  net_score int default 0,

  demerit_frequency int,
  trend text check (trend in ('improving','stable','declining')),

  risk_level text check (risk_level in ('green','yellow','red')),

  primary_issue_type text,
  interpretation text,

  last_computed timestamp with time zone default now(),

  primary key (student_id, time_window)
);

create table public.student_behaviour_patterns (
  pattern_id uuid primary key default gen_random_uuid(),

  student_id uuid not null,
  pattern_type text,
  pattern_description text,
  confidence_score numeric,

  detected_at timestamp with time zone default now()
);

create table public.intervention_templates (
  template_id uuid primary key default gen_random_uuid(),

  trigger_type text,
  title text,
  description text,

  suggested_actions jsonb,
  review_days int
);

create table public.student_interventions (
  intervention_id uuid primary key default gen_random_uuid(),

  student_id uuid not null,
  template_id uuid,

  assigned_by uuid,
  status text check (status in ('active','completed','abandoned')),

  notes text,
  assigned_at timestamp with time zone default now(),
  review_due date
);

create view public.v_student_behaviour_summary as
select
  s.student_id,
  s.student_name,
  s.grade,
  i.time_window,
  i.total_merits,
  i.total_demerits,
  i.net_score,
  i.risk_level,
  i.interpretation,
  i.last_computed
from student_behaviour_insights i
join students s on s.student_id = i.student_id;
