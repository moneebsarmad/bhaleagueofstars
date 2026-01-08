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
};

type MeritEntry = {
  student_name: string;
  staff_name: string | null;
  points: number;
  timestamp: string | null;
};

export default function SearchPage() {
  const { house } = useHouseSelection();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [merits, setMerits] = useState<MeritEntry[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!house) return;
    const canonicalHouse = canonicalHouseName(house);

    const fetchData = async () => {
      setLoading(true);
      try {
        const [studentsRes, meritsRes] = await Promise.all([
          supabase
            .from("students")
            .select("student_name, grade, section")
            .eq("house", canonicalHouse),
          supabase
            .from("merit_log")
            .select("student_name, staff_name, points, timestamp")
            .eq("house", canonicalHouse),
        ]);
        setStudents((studentsRes.data || []) as StudentRow[]);
        setMerits((meritsRes.data || []) as MeritEntry[]);
      } catch (error) {
        console.error("Error loading search data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [house]);

  const normalizedQuery = query.trim().toLowerCase();
  const matchedStudents = useMemo(() => {
    if (!normalizedQuery) return [];
    return students.filter((student) =>
      student.student_name.toLowerCase().includes(normalizedQuery)
    );
  }, [normalizedQuery, students]);

  const matchedStaff = useMemo(() => {
    if (!normalizedQuery) return [];
    const staffNames = new Set(
      merits
        .map((entry) => entry.staff_name?.trim() || "")
        .filter((name) => name)
        .filter((name) => name.toLowerCase().includes(normalizedQuery))
    );
    return Array.from(staffNames);
  }, [normalizedQuery, merits]);

  const getStudentPoints = (name: string) =>
    merits.filter((m) => m.student_name === name).reduce((sum, m) => sum + Number(m.points || 0), 0);

  if (loading || !house) {
    return <LoadingState label="Loading search..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-[#1a1a2e]/40">Search</p>
        <h1 className="text-2xl font-semibold text-[#1a1a2e]">Find Students & Staff</h1>
      </div>

      <input
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search a student or staff member..."
        className="w-full px-4 py-3 rounded-xl border border-[#1a1a2e]/10"
      />

      {normalizedQuery && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-[#1a1a2e] mb-4">Students</h2>
            {matchedStudents.length === 0 ? (
              <p className="text-sm text-[#1a1a2e]/50">No students found.</p>
            ) : (
              <div className="space-y-3">
                {matchedStudents.map((student) => (
                  <div key={student.student_name} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-semibold text-[#1a1a2e]">{student.student_name}</p>
                      <p className="text-xs text-[#1a1a2e]/50">
                        Grade {student.grade ?? "—"}
                        {student.section ?? ""}
                      </p>
                    </div>
                    <span className="font-semibold text-[#055437]">+{getStudentPoints(student.student_name)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-[#1a1a2e] mb-4">Staff</h2>
            {matchedStaff.length === 0 ? (
              <p className="text-sm text-[#1a1a2e]/50">No staff found.</p>
            ) : (
              <div className="space-y-3">
                {matchedStaff.map((name) => {
                  const entries = merits.filter((m) => m.staff_name === name);
                  const points = entries.reduce((sum, m) => sum + Number(m.points || 0), 0);
                  return (
                    <div key={name} className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-[#1a1a2e]">{name}</span>
                      <span className="font-semibold text-[#055437]">+{points}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
