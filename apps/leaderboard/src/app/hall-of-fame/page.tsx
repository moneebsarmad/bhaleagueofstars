"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface HallEntry {
  studentName: string;
  points: number;
}

interface HallSection {
  id: string;
  title: string;
  subtitle: string;
  view: string;
  accent: string;
  tint: string;
  icon: string;
}

const sections: HallSection[] = [
  {
    id: "century",
    title: "Century Club",
    subtitle: "Students with 100+ individual points",
    view: "century_club",
    accent: "#9a7b1a",
    tint: "#f7f1dc",
    icon: "100",
  },
  {
    id: "badr",
    title: "Badr Club",
    subtitle: "Students with 300+ individual points",
    view: "badr_club",
    accent: "#3b4a6b",
    tint: "#eef1f7",
    icon: "🌙",
  },
  {
    id: "fath",
    title: "Fath Club",
    subtitle: "Students with 500+ individual points",
    view: "fath_club",
    accent: "#23523b",
    tint: "#eef7f2",
    icon: "🏆",
  },
];

function normalizeEntry(row: Record<string, unknown>): HallEntry | null {
  const studentRaw =
    row.student_name ??
    row.student ??
    row.name ??
    row.full_name ??
    row.studentName ??
    "";
  const pointsRaw =
    row.total_points ??
    row.points ??
    row.total ??
    row.score ??
    0;

  const studentName = String(studentRaw ?? "").trim();
  if (!studentName) {
    return null;
  }

  return {
    studentName,
    points: Number(pointsRaw) || 0,
  };
}

export default function HallOfFamePage() {
  const [data, setData] = useState<Record<string, HallEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function fetchSection(section: HallSection) {
      const { data, error } = await supabase
        .from(section.view)
        .select("*");
      if (error) {
        throw error;
      }
      const entries =
        data?.map((row: Record<string, unknown>) => normalizeEntry(row)) ?? [];
      return entries.filter(Boolean) as HallEntry[];
    }

    async function fetchAll() {
      try {
        const results = await Promise.all(
          sections.map(async (section) => ({
            view: section.view,
            entries: await fetchSection(section),
          }))
        );
        const next: Record<string, HallEntry[]> = {};
        results.forEach((result) => {
          next[result.view] = result.entries;
        });
        setData(next);
      } catch (err) {
        console.error("Error fetching Hall of Fame:", err);
        setErrorMessage("Unable to load Hall of Fame right now.");
      } finally {
        setLoading(false);
      }
    }

    fetchAll();

    const channel = supabase
      .channel("hall-of-fame-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "merit_log" },
        () => {
          fetchAll();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        () => {
          fetchAll();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div
      className="min-h-screen py-6 px-4 sm:px-6 lg:px-8 starry-bg flex flex-col"
      style={{ background: "#1a1a2e" }}
    >
      <div className="max-w-6xl mx-auto w-full flex-1">
        <div className="absolute top-4 right-6 flex items-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-[#c9a227] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[#c9a227] transition hover:bg-[#c9a227] hover:text-[#1a1a2e]"
            style={{ fontFamily: "var(--font-cinzel), 'Cinzel', sans-serif" }}
          >
            Leaderboard
          </Link>
          <Link
            href="/house-mvps"
            className="inline-flex items-center gap-2 rounded-full border border-[#c9a227] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[#c9a227] transition hover:bg-[#c9a227] hover:text-[#1a1a2e]"
            style={{ fontFamily: "var(--font-cinzel), 'Cinzel', sans-serif" }}
          >
            House MVPs
          </Link>
        </div>

        <header className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <Image
              src="/crest.png"
              alt="League of Stars Crest"
              width={90}
              height={90}
              className="drop-shadow-lg"
              priority
            />
          </div>
          <h1
            className="italic text-3xl sm:text-4xl md:text-5xl text-white mb-2 gold-underline pb-1"
            style={{
              fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
            }}
          >
            Hall of Fame
          </h1>
          <p
            className="italic text-lg sm:text-xl mt-3"
            style={{
              color: "#c9a227",
              fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
            }}
          >
            Milestones that celebrate student excellence
          </p>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-white text-lg">Loading Hall of Fame...</p>
          </div>
        ) : errorMessage ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-white text-lg">{errorMessage}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {sections.map((section) => {
              const entries = data[section.view] || [];

              return (
                <div
                  key={section.id}
                  className="rounded-lg overflow-hidden shadow-lg float-card"
                  style={{
                    borderLeft: `5px solid ${section.accent}`,
                    background: section.tint,
                  }}
                >
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span
                        className="text-xl"
                        style={{
                          color: section.accent,
                          fontFamily:
                            "var(--font-playfair), 'Playfair Display', Georgia, serif",
                        }}
                      >
                        {section.icon}
                      </span>
                      <div>
                        <h2
                          className="text-2xl font-bold"
                          style={{
                            color: section.accent,
                            fontFamily:
                              "var(--font-playfair), 'Playfair Display', Georgia, serif",
                          }}
                        >
                          {section.title}
                        </h2>
                        <p
                          className="text-sm"
                          style={{
                            color: "#4a4a4a",
                            fontFamily:
                              "var(--font-cinzel), 'Cinzel', sans-serif",
                          }}
                        >
                          {section.subtitle}
                        </p>
                      </div>
                    </div>
                    <div
                      className="text-sm font-semibold"
                      style={{
                        color: section.accent,
                        fontFamily:
                          "var(--font-cinzel), 'Cinzel', sans-serif",
                      }}
                    >
                      {entries.length} Total
                    </div>
                  </div>

                  <div className="px-5 pb-4">
                    {entries.length === 0 ? (
                      <p
                        className="text-sm"
                        style={{
                          color: "#4a4a4a",
                          fontFamily:
                            "var(--font-cinzel), 'Cinzel', sans-serif",
                        }}
                      >
                        No students have reached this milestone yet.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {entries.map((entry, index) => (
                          <div
                            key={`${section.id}-${entry.studentName}-${index}`}
                            className="flex items-center justify-between rounded-md px-4 py-2"
                            style={{
                              background: "rgba(255,255,255,0.7)",
                            }}
                          >
                            <span
                              className="text-sm font-semibold"
                              style={{
                                color: "#1a1a2e",
                                fontFamily:
                                  "var(--font-cinzel), 'Cinzel', sans-serif",
                              }}
                            >
                              {entry.studentName}
                            </span>
                            <span
                              className="text-sm font-bold"
                              style={{
                                color: section.accent,
                                fontFamily:
                                  "var(--font-playfair), 'Playfair Display', Georgia, serif",
                              }}
                            >
                              {entry.points.toLocaleString()} pts
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
