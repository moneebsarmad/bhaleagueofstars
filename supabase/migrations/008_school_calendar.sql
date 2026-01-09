-- School calendar for valid school days
CREATE TABLE IF NOT EXISTS school_calendar (
  school_date DATE PRIMARY KEY,
  is_school_day BOOLEAN NOT NULL DEFAULT TRUE,
  term TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE school_calendar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view school calendar" ON school_calendar;
CREATE POLICY "Authenticated can view school calendar"
ON school_calendar FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Staff manage permission can modify school calendar" ON school_calendar;
CREATE POLICY "Staff manage permission can modify school calendar"
ON school_calendar FOR ALL
USING (has_permission(auth.uid(), 'staff.manage'))
WITH CHECK (has_permission(auth.uid(), 'staff.manage'));
