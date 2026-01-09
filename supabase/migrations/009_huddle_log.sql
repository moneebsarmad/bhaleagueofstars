-- Huddle log table for simplified implementation health
CREATE TABLE IF NOT EXISTS huddle_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_end_date DATE NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE huddle_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can manage huddle log" ON huddle_log;
CREATE POLICY "Admin can manage huddle log"
ON huddle_log FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
  )
);

-- Extend decision_log to support simplified v2 fields
ALTER TABLE decision_log
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS outcome_tag TEXT,
  ADD COLUMN IF NOT EXISTS action_type TEXT,
  ADD COLUMN IF NOT EXISTS cycle_end_date DATE;
