create or replace view analytics_entries as
select
  student_name,
  grade,
  section,
  house,
  points,
  staff_name,
  subcategory,
  "timestamp",
  case
    when lower(coalesce(r, '')) like '%respect%' then 'Respect'
    when lower(coalesce(r, '')) like '%responsibility%' then 'Responsibility'
    when lower(coalesce(r, '')) like '%righteousness%' then 'Righteousness'
    else ''
  end as category,
  lower(coalesce(student_name, '')) || '|' || coalesce(grade::text, '') || '|' || lower(coalesce(section, '')) as student_key
from merit_log;

create or replace function get_analytics_stats(
  p_house text default null,
  p_grade integer default null,
  p_section text default null,
  p_staff text default null,
  p_category text default null,
  p_subcategory text default null,
  p_start_date date default null,
  p_end_date date default null
)
returns table(
  total_points numeric,
  total_records bigint,
  unique_students bigint,
  active_staff bigint,
  avg_per_student numeric,
  avg_per_award numeric
)
language sql
stable
as $$
  with filtered as (
    select *
    from analytics_entries
    where (p_house is null or p_house = '' or house = p_house)
      and (p_grade is null or grade = p_grade)
      and (p_section is null or p_section = '' or section = p_section)
      and (p_staff is null or p_staff = '' or staff_name = p_staff)
      and (p_category is null or p_category = '' or category = p_category)
      and (p_subcategory is null or p_subcategory = '' or subcategory = p_subcategory)
      and (p_start_date is null or "timestamp"::date >= p_start_date)
      and (p_end_date is null or "timestamp"::date <= p_end_date)
  )
  select
    coalesce(sum(points), 0) as total_points,
    count(*) as total_records,
    count(distinct student_key) as unique_students,
    count(distinct staff_name) filter (where staff_name is not null and staff_name <> '') as active_staff,
    case
      when count(distinct student_key) > 0
        then round(coalesce(sum(points), 0)::numeric / count(distinct student_key), 1)
      else 0
    end as avg_per_student,
    case
      when count(*) > 0
        then round(coalesce(sum(points), 0)::numeric / count(*), 1)
      else 0
    end as avg_per_award
  from filtered;
$$;
