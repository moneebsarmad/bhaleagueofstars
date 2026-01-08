"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { canonicalHouseName, getHouseConfigRecord } from "@/lib/school.config";
import { useHouseSelection } from "@/lib/houseSelection";
import StatCard from "@/components/StatCard";
import LoadingState from "@/components/LoadingState";

type HouseStanding = {
  house: string;
  total_points: number;
};

type MeritEntry = {
  student_name: string;
  staff_name: string | null;
  points: number;
  house: string;
  date_of_event: string | null;
  timestamp: string | null;
};

type StudentRow = {
  student_name: string;
  grade: number | null;
  section: string | null;
  gender: string | null;
};

const houseConfig = getHouseConfigRecord();

export default function DashboardPage() {
  const { house } = useHouseSelection();
  const [loading, setLoading] = useState(true);
  const [rank, setRank] = useState<number | null>(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const [monthPoints, setMonthPoints] = useState(0);
  const [topStudents, setTopStudents] = useState<{ name: string; points: number }[]>([]);
  const [staffStats, setStaffStats] = useState<{ active: number; total: number; points: number }>({
    active: 0,
    total: 0,
    points: 0,
  });
  const [mvp, setMvp] = useState<{ boy: string | null; girl: string | null }>({ boy: null, girl: null });
  const [leadership, setLeadership] = useState<{ role: string; name: string }[]>([]);

  useEffect(() => {
    if (!house) return;
    const canonicalHouse = canonicalHouseName(house);

    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const [standingsRes, meritRes, studentsRes, leadershipRes] = await Promise.all([
          supabase.from("house_standings_view").select("house,total_points"),
          supabase
            .from("merit_log")
            .select("student_name, staff_name, points, house, date_of_event, timestamp")
            .eq("house", canonicalHouse),
          supabase
            .from("students")
            .select("student_name, grade, section, gender")
            .eq("house", canonicalHouse),
          supabase
            .from("house_leadership")
            .select("role, display_name, email")
            .eq("house", canonicalHouse)
            .eq("active", true),
        ]);

        const standings = (standingsRes.data || []) as HouseStanding[];
        const sorted = standings
          .map((row) => ({ house: canonicalHouseName(row.house), total_points: row.total_points || 0 }))
          .sort((a, b) => b.total_points - a.total_points);
        const currentRank = sorted.findIndex((row) => row.house === canonicalHouse) + 1;
        setRank(currentRank > 0 ? currentRank : null);
        const currentPoints = sorted.find((row) => row.house === canonicalHouse)?.total_points || 0;
        setTotalPoints(currentPoints);

        const meritEntries = (meritRes.data || []) as MeritEntry[];
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const last30Days = new Date(now);
        last30Days.setDate(now.getDate() - 30);

        const monthTotals = new Map<string, number>();
        const staffSetAll = new Set<string>();
        const staffSetActive = new Set<string>();
        let staffPoints = 0;

        meritEntries.forEach((entry) => {
          const points = Number(entry.points || 0);
          const staffName = entry.staff_name?.trim() || "";
          if (staffName) {
            staffSetAll.add(staffName);
          }
          const eventDate = entry.date_of_event ? new Date(entry.date_of_event) : null;
          if (eventDate && eventDate >= monthStart) {
            monthTotals.set(
              entry.student_name,
              (monthTotals.get(entry.student_name) || 0) + points
            );
          }
          const entryDate = entry.timestamp ? new Date(entry.timestamp) : eventDate;
          if (entryDate && entryDate >= last30Days) {
            if (staffName) staffSetActive.add(staffName);
            staffPoints += points;
          }
        });

        const monthlyPointsTotal = Array.from(monthTotals.values()).reduce((sum, p) => sum + p, 0);
        setMonthPoints(monthlyPointsTotal);

        const topTen = Array.from(monthTotals.entries())
          .map(([name, points]) => ({ name, points }))
          .sort((a, b) => b.points - a.points)
          .slice(0, 10);
        setTopStudents(topTen);

        setStaffStats({
          active: staffSetActive.size,
          total: staffSetAll.size,
          points: staffPoints,
        });

        const students = (studentsRes.data || []) as StudentRow[];
        const leadershipRows = (leadershipRes.data || []) as { role: string; display_name: string | null; email: string | null }[];
        const genderMap = new Map<string, string>();
        students.forEach((student) => {
          genderMap.set(student.student_name, student.gender?.toLowerCase() || "");
        });

        const sortedMonthly = Array.from(monthTotals.entries())
          .map(([name, points]) => ({ name, points, gender: genderMap.get(name) || "" }))
          .sort((a, b) => b.points - a.points);

        const topBoy = sortedMonthly.find((row) => ["m", "male", "boy"].includes(row.gender))?.name || null;
        const topGirl = sortedMonthly.find((row) => ["f", "female", "girl"].includes(row.gender))?.name || null;

        setMvp({ boy: topBoy, girl: topGirl });

        const rolePriority = { mentor: 1, captain: 2, vice_captain: 3 } as Record<string, number>;
        const leadershipSorted = leadershipRows
          .map((row) => ({
            role: row.role,
            name: row.display_name || row.email || "Unassigned",
          }))
          .sort((a, b) => (rolePriority[a.role] || 99) - (rolePriority[b.role] || 99));

        setLeadership(leadershipSorted);
      } catch (error) {
        console.error("Error loading dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [house]);

  const participationRate = useMemo(() => {
    if (staffStats.total === 0) return "—";
    return `${Math.round((staffStats.active / staffStats.total) * 100)}%`;
  }, [staffStats]);

  if (loading || !house) {
    return <LoadingState label="Loading house overview..." />;
  }

  const houseInfo = houseConfig[canonicalHouseName(house)];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#1a1a2e]/40">House Snapshot</p>
          <h1 className="text-3xl font-semibold text-[#1a1a2e]">{houseInfo?.name}</h1>
          <div className="gold-rule mt-3"></div>
        </div>
        <div className="card px-6 py-4" style={{ background: houseInfo?.gradient }}>
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Rank</p>
          <p className="text-3xl text-white font-semibold">{rank ?? "—"}</p>
          <p className="text-sm text-white/70 mt-2">{totalPoints.toLocaleString()} total points</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Month Points" value={monthPoints.toLocaleString()} helper="Current month totals" />
        <StatCard label="Staff Participation" value={`${staffStats.active} active`} helper={`Rate: ${participationRate}`} />
        <StatCard label="Staff Points Awarded" value={staffStats.points.toLocaleString()} helper="Last 30 days" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-[#1a1a2e] mb-4">Top 10 Students (Month)</h2>
          {topStudents.length === 0 ? (
            <p className="text-sm text-[#1a1a2e]/50">No student points logged yet.</p>
          ) : (
            <div className="space-y-3">
              {topStudents.map((student, index) => (
                <div key={student.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-[#1a1a2e]/5 flex items-center justify-center text-xs font-semibold">
                      {index + 1}
                    </span>
                    <span className="font-medium text-[#1a1a2e]">{student.name}</span>
                  </div>
                  <span className="font-semibold text-[#055437]">+{student.points}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-semibold text-[#1a1a2e] mb-4">Monthly MVP</h2>
          <div className="grid grid-cols-1 gap-4">
            <div className="p-4 rounded-xl bg-[#f5f3ef]">
              <p className="text-xs uppercase tracking-[0.2em] text-[#1a1a2e]/40">Top Boy</p>
              <p className="text-lg font-semibold text-[#1a1a2e] mt-2">{mvp.boy || "—"}</p>
            </div>
            <div className="p-4 rounded-xl bg-[#f5f3ef]">
              <p className="text-xs uppercase tracking-[0.2em] text-[#1a1a2e]/40">Top Girl</p>
              <p className="text-lg font-semibold text-[#1a1a2e] mt-2">{mvp.girl || "—"}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-xl font-semibold text-[#1a1a2e] mb-4">House Leadership</h2>
        {leadership.length === 0 ? (
          <p className="text-sm text-[#1a1a2e]/50">No leadership assignments yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {leadership.map((leader) => (
              <div key={`${leader.role}-${leader.name}`} className="rounded-xl border border-[#1a1a2e]/10 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[#1a1a2e]/40">{leader.role.replace("_", " ")}</p>
                <p className="text-base font-semibold text-[#1a1a2e] mt-2">{leader.name}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
