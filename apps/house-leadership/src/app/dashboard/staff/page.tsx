"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { canonicalHouseName } from "@/lib/school.config";
import { useHouseSelection } from "@/lib/houseSelection";
import LoadingState from "@/components/LoadingState";

type StaffMetric = {
  name: string;
  awards: number;
  points: number;
  lastActive: string | null;
};

type MeritEntry = {
  staff_name: string | null;
  points: number;
  timestamp: string | null;
};

export default function StaffEngagementPage() {
  const { house } = useHouseSelection();
  const [loading, setLoading] = useState(true);
  const [staffMetrics, setStaffMetrics] = useState<StaffMetric[]>([]);

  useEffect(() => {
    if (!house) return;
    const canonicalHouse = canonicalHouseName(house);

    const fetchStaff = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("merit_log")
          .select("staff_name, points, timestamp")
          .eq("house", canonicalHouse);

        if (error) {
          console.error("Error fetching staff metrics:", error.message);
        }

        const entries = (data || []) as MeritEntry[];
        const map = new Map<string, StaffMetric>();

        entries.forEach((entry) => {
          const name = entry.staff_name?.trim();
          if (!name) return;
          const existing = map.get(name) || { name, awards: 0, points: 0, lastActive: null };
          existing.awards += 1;
          existing.points += Number(entry.points || 0);
          if (!existing.lastActive || (entry.timestamp && entry.timestamp > existing.lastActive)) {
            existing.lastActive = entry.timestamp || existing.lastActive;
          }
          map.set(name, existing);
        });

        const rows = Array.from(map.values()).sort((a, b) => b.points - a.points);
        setStaffMetrics(rows);
      } catch (error) {
        console.error("Error fetching staff engagement:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStaff();
  }, [house]);

  const activeCount = useMemo(() => staffMetrics.length, [staffMetrics]);

  if (loading || !house) {
    return <LoadingState label="Loading staff engagement..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#1a1a2e]/40">Staff Engagement</p>
          <h1 className="text-2xl font-semibold text-[#1a1a2e]">Participation & Activity</h1>
        </div>
        <div className="card px-4 py-3 text-sm text-[#1a1a2e]/70">
          Active staff: <span className="font-semibold text-[#1a1a2e]">{activeCount}</span>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="grid grid-cols-4 gap-4 px-6 py-3 text-xs uppercase tracking-[0.2em] text-[#1a1a2e]/40 bg-[#faf9f7]">
          <span>Staff Member</span>
          <span>Awards</span>
          <span>Total Points</span>
          <span>Last Active</span>
        </div>
        <div className="divide-y divide-[#1a1a2e]/5">
          {staffMetrics.map((row) => (
            <div key={row.name} className="grid grid-cols-4 gap-4 px-6 py-4 text-sm">
              <span className="font-semibold text-[#1a1a2e]">{row.name}</span>
              <span>{row.awards}</span>
              <span className="font-semibold text-[#055437]">+{row.points}</span>
              <span className="text-[#1a1a2e]/60">{row.lastActive ? new Date(row.lastActive).toLocaleDateString() : "—"}</span>
            </div>
          ))}
          {staffMetrics.length === 0 && (
            <div className="px-6 py-6 text-sm text-[#1a1a2e]/50">No staff activity logged yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
