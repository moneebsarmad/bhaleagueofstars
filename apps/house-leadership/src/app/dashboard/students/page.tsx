"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { canonicalHouseName } from "@/lib/school.config";
import { useHouseSelection } from "@/lib/houseSelection";
import LoadingState from "@/components/LoadingState";

type StudentRow = {
  student_name: string;
  grade: number | null;
  section: string | null;
  gender: string | null;
};

type MeritEntry = {
  student_name: string;
  points: number;
  date_of_event: string | null;
};

type StudentStats = StudentRow & {
  totalPoints: number;
  monthPoints: number;
  streak: number;
  badges: string[];
};

const badgeThresholds = [
  { label: "Rising Star", points: 100 },
  { label: "House Beacon", points: 250 },
  { label: "Legacy Builder", points: 500 },
  { label: "Champion", points: 1000 },
];

export default function StudentsPage() {
  const { house } = useHouseSelection();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentStats[]>([]);
  const [search, setSearch] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterSection, setFilterSection] = useState("");

  useEffect(() => {
    if (!house) return;
    const canonicalHouse = canonicalHouseName(house);

    const fetchStudents = async () => {
      setLoading(true);
      try {
        const [studentsRes, meritRes] = await Promise.all([
          supabase
            .from("students")
            .select("student_name, grade, section, gender")
            .eq("house", canonicalHouse),
          supabase
            .from("merit_log")
            .select("student_name, points, date_of_event")
            .eq("house", canonicalHouse),
        ]);

        const studentRows = (studentsRes.data || []) as StudentRow[];
        const meritEntries = (meritRes.data || []) as MeritEntry[];

        const totals = new Map<string, number>();
        const monthTotals = new Map<string, number>();
        const streakDays = new Map<string, Set<string>>();
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const streakWindow = new Date(now);
        streakWindow.setDate(now.getDate() - 6);

        meritEntries.forEach((entry) => {
          const points = Number(entry.points || 0);
          totals.set(entry.student_name, (totals.get(entry.student_name) || 0) + points);

          if (entry.date_of_event) {
            const eventDate = new Date(entry.date_of_event);
            if (eventDate >= monthStart) {
              monthTotals.set(entry.student_name, (monthTotals.get(entry.student_name) || 0) + points);
            }
            if (eventDate >= streakWindow) {
              if (!streakDays.has(entry.student_name)) {
                streakDays.set(entry.student_name, new Set());
              }
              streakDays.get(entry.student_name)?.add(entry.date_of_event);
            }
          }
        });

        const combined = studentRows.map((student) => {
          const total = totals.get(student.student_name) || 0;
          const month = monthTotals.get(student.student_name) || 0;
          const streak = streakDays.get(student.student_name)?.size || 0;
          const badges = badgeThresholds
            .filter((badge) => total >= badge.points)
            .map((badge) => badge.label);
          return {
            ...student,
            totalPoints: total,
            monthPoints: month,
            streak,
            badges,
          } satisfies StudentStats;
        });

        setStudents(combined);
      } catch (error) {
        console.error("Error loading students:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [house]);

  const grades = useMemo(
    () => Array.from(new Set(students.map((s) => s.grade).filter(Boolean))).sort((a, b) => (a ?? 0) - (b ?? 0)),
    [students]
  );
  const sections = useMemo(
    () =>
      Array.from(
        new Set(
          students
            .filter((s) => !filterGrade || s.grade === Number(filterGrade))
            .map((s) => s.section)
            .filter(Boolean)
        )
      ).sort(),
    [students, filterGrade]
  );

  const filtered = students.filter((student) => {
    if (filterGrade && student.grade !== Number(filterGrade)) return false;
    if (filterSection && student.section !== filterSection) return false;
    if (search && !student.student_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading || !house) {
    return <LoadingState label="Loading house students..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#1a1a2e]/40">Students</p>
          <h1 className="text-2xl font-semibold text-[#1a1a2e]">House Roster & Performance</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search student..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="px-3 py-2 rounded-lg border border-[#1a1a2e]/10"
          />
          <select
            value={filterGrade}
            onChange={(event) => setFilterGrade(event.target.value)}
            className="px-3 py-2 rounded-lg border border-[#1a1a2e]/10"
          >
            <option value="">All grades</option>
            {grades.map((grade) => (
              <option key={grade} value={grade ?? ""}>
                Grade {grade}
              </option>
            ))}
          </select>
          <select
            value={filterSection}
            onChange={(event) => setFilterSection(event.target.value)}
            className="px-3 py-2 rounded-lg border border-[#1a1a2e]/10"
          >
            <option value="">All sections</option>
            {sections.map((section) => (
              <option key={section} value={section ?? ""}>
                Section {section}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="grid grid-cols-6 gap-4 px-6 py-3 text-xs uppercase tracking-[0.2em] text-[#1a1a2e]/40 bg-[#faf9f7]">
          <span className="col-span-2">Student</span>
          <span>Grade</span>
          <span>Total Points</span>
          <span>Month Points</span>
          <span>Streak</span>
        </div>
        <div className="divide-y divide-[#1a1a2e]/5">
          {filtered.map((student) => (
            <div key={student.student_name} className="grid grid-cols-6 gap-4 px-6 py-4 text-sm">
              <div className="col-span-2">
                <p className="font-semibold text-[#1a1a2e]">{student.student_name}</p>
                <p className="text-xs text-[#1a1a2e]/50">
                  {student.badges.length > 0 ? student.badges.join(" • ") : "No badges yet"}
                </p>
              </div>
              <span>
                {student.grade ?? "—"}
                {student.section ? student.section : ""}
              </span>
              <span className="font-semibold text-[#055437]">+{student.totalPoints}</span>
              <span className="text-[#1a1a2e]/70">+{student.monthPoints}</span>
              <span>{student.streak} days</span>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-6 py-6 text-sm text-[#1a1a2e]/50">No students match these filters.</div>
          )}
        </div>
      </div>
    </div>
  );
}
