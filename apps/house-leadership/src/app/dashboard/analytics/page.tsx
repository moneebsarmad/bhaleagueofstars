"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { canonicalHouseName } from "@/lib/school.config";
import { useHouseSelection } from "@/lib/houseSelection";
import LoadingState from "@/components/LoadingState";
import StatCard from "@/components/StatCard";

type StudentRow = {
  student_name: string;
  grade: number | null;
  section: string | null;
};

type MeritEntry = {
  student_name: string;
  staff_name: string | null;
  points: number;
};

export default function AnalyticsPage() {
  const { house } = useHouseSelection();
  const [loading, setLoading] = useState(true);
  const [studentMetrics, setStudentMetrics] = useState({
    total: 0,
    avgPoints: 0,
    topGrade: "—",
    topSection: "—",
  });
  const [staffMetrics, setStaffMetrics] = useState({
    total: 0,
    avgPoints: 0,
    topStaff: [] as { name: string; points: number }[],
  });

  useEffect(() => {
    if (!house) return;
    const canonicalHouse = canonicalHouseName(house);

    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const [studentsRes, meritRes] = await Promise.all([
          supabase
            .from("students")
            .select("student_name, grade, section")
            .eq("house", canonicalHouse),
          supabase
            .from("merit_log")
            .select("student_name, staff_name, points")
            .eq("house", canonicalHouse),
        ]);

        const students = (studentsRes.data || []) as StudentRow[];
        const merits = (meritRes.data || []) as MeritEntry[];

        const studentPoints = new Map<string, number>();
        const gradePoints = new Map<string, number>();
        const sectionPoints = new Map<string, number>();
        const staffPoints = new Map<string, number>();

        merits.forEach((entry) => {
          const points = Number(entry.points || 0);
          studentPoints.set(entry.student_name, (studentPoints.get(entry.student_name) || 0) + points);
          if (entry.staff_name) {
            staffPoints.set(entry.staff_name, (staffPoints.get(entry.staff_name) || 0) + points);
          }
        });

        students.forEach((student) => {
          const key = student.student_name;
          const points = studentPoints.get(key) || 0;
          const gradeKey = student.grade ? `Grade ${student.grade}` : "Unknown";
          const sectionKey = student.section ? `Section ${student.section}` : "Unknown";
          gradePoints.set(gradeKey, (gradePoints.get(gradeKey) || 0) + points);
          sectionPoints.set(sectionKey, (sectionPoints.get(sectionKey) || 0) + points);
        });

        const topGrade = Array.from(gradePoints.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
        const topSection = Array.from(sectionPoints.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

        const totalPoints = Array.from(studentPoints.values()).reduce((sum, value) => sum + value, 0);
        const avgPoints = students.length > 0 ? Math.round(totalPoints / students.length) : 0;

        const staffTotals = Array.from(staffPoints.entries()).map(([name, points]) => ({ name, points }));
        staffTotals.sort((a, b) => b.points - a.points);
        const staffAvg = staffTotals.length > 0 ? Math.round(staffTotals.reduce((sum, row) => sum + row.points, 0) / staffTotals.length) : 0;

        setStudentMetrics({
          total: students.length,
          avgPoints,
          topGrade,
          topSection,
        });

        setStaffMetrics({
          total: staffTotals.length,
          avgPoints: staffAvg,
          topStaff: staffTotals.slice(0, 5),
        });
      } catch (error) {
        console.error("Error loading analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [house]);

  const studentCards = useMemo(
    () => [
      { label: "House Students", value: studentMetrics.total.toString(), helper: "Total members" },
      { label: "Avg Points", value: studentMetrics.avgPoints.toString(), helper: "Across all students" },
      { label: "Top Grade", value: studentMetrics.topGrade, helper: "Most points earned" },
      { label: "Top Section", value: studentMetrics.topSection, helper: "Most points earned" },
    ],
    [studentMetrics]
  );

  if (loading || !house) {
    return <LoadingState label="Loading analytics..." />;
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-[#1a1a2e]/40">Analytics</p>
        <h1 className="text-2xl font-semibold text-[#1a1a2e]">Student & Staff Metrics</h1>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-[#1a1a2e] mb-4">Student Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {studentCards.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-[#1a1a2e] mb-4">Staff Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard label="Active Staff" value={staffMetrics.total.toString()} helper="Participants logged" />
          <StatCard label="Avg Points" value={staffMetrics.avgPoints.toString()} helper="Per staff member" />
          <StatCard label="Top Contributors" value={staffMetrics.topStaff.length.toString()} helper="Top 5 listed below" />
        </div>

        {staffMetrics.topStaff.length === 0 ? (
          <p className="text-sm text-[#1a1a2e]/50">No staff participation yet.</p>
        ) : (
          <div className="space-y-3">
            {staffMetrics.topStaff.map((staff, index) => (
              <div key={staff.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-[#1a1a2e]/5 flex items-center justify-center text-xs font-semibold">
                    {index + 1}
                  </span>
                  <span className="font-medium text-[#1a1a2e]">{staff.name}</span>
                </div>
                <span className="font-semibold text-[#055437]">+{staff.points}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
