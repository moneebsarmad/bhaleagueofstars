-- ============================================================================
-- LEAGUE OF STARS - IMPLEMENTATION HEALTH MODULE
-- ============================================================================

-- Implementation events (huddles, calibration, recognition, training)
CREATE TABLE IF NOT EXISTS implementation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN ('HUDDLE', 'CALIBRATION', 'RECOGNITION', 'TRAINING')),
  event_date DATE NOT NULL,
  cycle_id INTEGER NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Decision log for biweekly cycles
CREATE TABLE IF NOT EXISTS decision_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id INTEGER NOT NULL,
  trigger_id TEXT,
  trigger_summary TEXT,
  selected_actions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  owner TEXT NOT NULL,
  due_date DATE,
  status TEXT NOT NULL CHECK (status IN ('Planned', 'In Progress', 'Completed', 'Dropped')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Baseline configuration for inflation index
CREATE TABLE IF NOT EXISTS baseline_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger log (optional, stores fired triggers)
CREATE TABLE IF NOT EXISTS trigger_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_id TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('Green', 'Yellow', 'Red')),
  metric_values JSONB,
  context JSONB,
  cycle_id INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Action menu library (AM01-AM12)
CREATE TABLE IF NOT EXISTS action_menu (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  steps TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  owner_role TEXT,
  success_metric TEXT,
  applicable_context JSONB
);

INSERT INTO action_menu (id, title, description, steps, owner_role, success_metric, applicable_context)
VALUES
  ('AM01', 'Participation Boost', 'Increase active logger rate across staff.', ARRAY[
    'Identify staff with 0 entries in period',
    'Send quick reminders + micro-training',
    'Follow up with coaching check-ins'
  ], 'Admin', 'Active logger rate >= 70%', '{"trigger":"adoption_low"}'),
  ('AM02', 'Stop the Teacher Lottery', 'Reduce concentration of entries among a few staff.', ARRAY[
    'Share participation tiers with staff',
    'Set team goal for minimum entries',
    'Celebrate wide participation'
  ], 'Admin', 'Top 1 share <= 35% and top 3 share <= 70%', '{"trigger":"lottery_high"}'),
  ('AM03', 'Inflation Watch', 'Address unusually high logging rate.', ARRAY[
    'Review high-frequency categories',
    'Re-calibrate definitions in huddle',
    'Spot-check notes for quality'
  ], 'Admin', 'Inflation index <= 1.3', '{"trigger":"inflation_high"}'),
  ('AM04', 'Other Overuse Cleanup', 'Reduce misuse of “Other” and improve notes.', ARRAY[
    'Clarify categories with examples',
    'Require notes for “Other”',
    'Audit top users of “Other”'
  ], 'Admin', 'Other usage <= 12% and notes compliance >= 85%', '{"trigger":"other_overuse"}'),
  ('AM05', 'Grade Weak Spot Intervention', 'Support grades with low participation.', ARRAY[
    'Identify lowest grade by entries/student',
    'Meet grade-level leads',
    'Set 2-week micro-goal'
  ], 'Admin', 'Weak grade shows positive trend', '{"trigger":"weak_grade"}'),
  ('AM06', 'Time-of-Day Breakdown', 'Address time-bucket spikes and blind spots.', ARRAY[
    'Review time-of-day heatmap',
    'Align expectations on logging timing',
    'Set reminder schedules'
  ], 'Admin', 'Balanced logging across day', '{"trigger":"time_spike"}'),
  ('AM07', 'Single-Student Over-Recognition', 'Prevent repetitive recognition of same student.', ARRAY[
    'Review repeated student list',
    'Coach staff on distribution',
    'Set diversity targets'
  ], 'Admin', 'No student exceeds repeat threshold', '{"trigger":"repeat_student"}'),
  ('AM08', 'Roster Hygiene Fix Sprint', 'Fix unknown staff/student or missing mapping issues.', ARRAY[
    'Audit unknown/orphan entries',
    'Update staff/student records',
    'Validate mappings weekly'
  ], 'Admin', '0 critical roster issues', '{"trigger":"roster_hygiene"}'),
  ('AM09', 'Calibration Refresh Needed', 'Update calibration to align standards.', ARRAY[
    'Schedule calibration huddle',
    'Review example scenarios',
    'Document updated guidelines'
  ], 'Admin', 'Calibration within 45 days', '{"trigger":"calibration_stale"}'),
  ('AM10', 'Low Signal Logging', 'Increase diversity in categories/subcategories.', ARRAY[
    'Review category spread',
    'Highlight underused categories',
    'Share examples for variety'
  ], 'Admin', 'Category diversity improves', '{"trigger":"low_diversity"}'),
  ('AM11', 'Decision Log Missing', 'Reinforce decision logging discipline.', ARRAY[
    'Log at least 1 decision this cycle',
    'Assign owner + due date',
    'Review follow-through weekly'
  ], 'Admin', 'Decision logged this cycle', '{"trigger":"decision_missing"}'),
  ('AM12', 'Recognition Loop Weak', 'Ensure recognition rituals happen consistently.', ARRAY[
    'Log a recognition event',
    'Highlight student/staff stories',
    'Plan next recognition moment'
  ], 'Admin', 'Recognition logged in last 14 days', '{"trigger":"recognition_missing"}')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE implementation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE baseline_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE trigger_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_menu ENABLE ROW LEVEL SECURITY;

-- Admins and super admins can manage
DROP POLICY IF EXISTS "Admin can manage implementation events" ON implementation_events;
CREATE POLICY "Admin can manage implementation events"
ON implementation_events FOR ALL
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

DROP POLICY IF EXISTS "Admin can manage decision log" ON decision_log;
CREATE POLICY "Admin can manage decision log"
ON decision_log FOR ALL
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

DROP POLICY IF EXISTS "Admin can manage baseline config" ON baseline_config;
CREATE POLICY "Admin can manage baseline config"
ON baseline_config FOR ALL
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

DROP POLICY IF EXISTS "Admin can manage trigger log" ON trigger_log;
CREATE POLICY "Admin can manage trigger log"
ON trigger_log FOR ALL
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

DROP POLICY IF EXISTS "Admin can view action menu" ON action_menu;
CREATE POLICY "Admin can view action menu"
ON action_menu FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
  )
);
