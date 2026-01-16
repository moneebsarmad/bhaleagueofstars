create or replace view house_mvp_monthly as
with base as (
  select
    date_trunc('month', timestamp::timestamptz)::date as month_start,
    house,
    student_name,
    grade,
    section,
    sum(points) as total_points
  from merit_log
  where student_name is not null
    and student_name <> ''
  group by 1, 2, 3, 4, 5
),
ranked as (
  select
    *,
    row_number() over (
      partition by month_start, house
      order by total_points desc, student_name asc
    ) as rank
  from base
)
select
  month_start,
  house,
  student_name,
  grade,
  section,
  total_points,
  rank
from ranked;
