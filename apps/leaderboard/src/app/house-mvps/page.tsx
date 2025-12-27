"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

const houseConfig: Record<
  string,
  { color: string; bgColor: string; logo?: string | null }
> = {
  "House of Abu Bakr": {
    color: "#2f0a61",
    bgColor: "#f6f1fb",
    logo: "/house_of_abubakr.png",
  },
  "House of 'Umar": {
    color: "#000068",
    bgColor: "#f2f3fb",
    logo: "/house_of_umar.png",
  },
  "House of 'A'ishah": {
    color: "#910000",
    bgColor: "#fdf1f1",
    logo: "/house_of_aishah.png",
  },
  "House of Khadijah": {
    color: "#055437",
    bgColor: "#f1fbf6",
    logo: "/house_of_khadijah.png",
  },
};

interface StudentEntry {
  houseName: string;
  studentName: string;
  points: number;
  rank?: number | null;
}

function normalizeHouseName(raw: string): string {
  const cleaned = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘`]/g, "'")
    .trim();
  if (!cleaned) {
    return "Unknown House";
  }
  const key = cleaned
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const compact = key.replace(/\s+/g, "");
  if (key.includes("abu bakr") || compact.includes("abubakr")) {
    return "House of Abu Bakr";
  }
  if (key.includes("umar")) {
    return "House of 'Umar";
  }
  if (key.includes("aishah") || compact.includes("aishah")) {
    return "House of 'A'ishah";
  }
  if (key.includes("khadijah")) {
    return "House of Khadijah";
  }
  return cleaned;
}

export default function HouseMvpsPage() {
  const [students, setStudents] = useState<StudentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    function getRowValue(
      row: Record<string, unknown>,
      keys: string[]
    ): unknown {
      for (const key of keys) {
        if (key in row) {
          return row[key];
        }
      }
      const normalizedKeys = Object.keys(row).reduce<Record<string, string>>(
        (acc, key) => {
          acc[key.toLowerCase()] = key;
          return acc;
        },
        {}
      );
      for (const key of keys) {
        const normalized = normalizedKeys[key.toLowerCase()];
        if (normalized) {
          return row[normalized];
        }
      }
      return undefined;
    }

    async function fetchTopStudents() {
      try {
        const { data, error } = await supabase
          .from("top_students_per_house")
          .select("*");

        if (error) {
          setErrorMessage("Unable to load House MVPs right now.");
          console.error("Supabase error:", error);
          return;
        }

        const normalized =
          data?.map((row: Record<string, unknown>) => {
            const houseNameRaw =
              getRowValue(row, ["house"]) ?? "";
            const studentNameRaw =
              getRowValue(row, ["student_name"]) ?? "";
            const pointsRaw =
              getRowValue(row, ["total_points"]) ?? 0;
            const rankRaw =
              getRowValue(row, ["house_rank"]) ?? NaN;

            const houseName = normalizeHouseName(
              String(houseNameRaw ?? "")
            );
            const studentName =
              String(studentNameRaw ?? "").trim() ||
              "Unnamed Student";
            const pointsValue = Number(pointsRaw) || 0;
            const rankValue = Number(rankRaw);

            return {
              houseName,
              studentName,
              points: pointsValue,
              rank: Number.isFinite(rankValue) ? rankValue : null,
            };
          }) ?? [];

        setStudents(normalized);
      } catch (err) {
        console.error("Error fetching House MVPs:", err);
        setErrorMessage("Unable to load House MVPs right now.");
      } finally {
        setLoading(false);
      }
    }

    fetchTopStudents();

    const channel = supabase
      .channel("house-mvps-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "merit_log" },
        () => {
          fetchTopStudents();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        () => {
          fetchTopStudents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const grouped = useMemo(() => {
    const groups: Record<string, StudentEntry[]> = {};
    students.forEach((entry) => {
      if (!groups[entry.houseName]) {
        groups[entry.houseName] = [];
      }
      groups[entry.houseName].push(entry);
    });

    Object.values(groups).forEach((houseStudents) => {
      houseStudents.sort((a, b) => {
        if (a.rank != null && b.rank != null) {
          return a.rank - b.rank;
        }
        if (a.rank != null) {
          return -1;
        }
        if (b.rank != null) {
          return 1;
        }
        if (b.points !== a.points) {
          return b.points - a.points;
        }
        return a.studentName.localeCompare(b.studentName);
      });
    });

    return groups;
  }, [students]);

  const houseOrder = useMemo(() => {
    const configured = Object.keys(houseConfig);
    const extras = Object.keys(grouped).filter(
      (houseName) => !configured.includes(houseName)
    );
    return [...configured, ...extras.sort()];
  }, [grouped]);

  const visibleHouses = useMemo(
    () => houseOrder.filter((houseName) => (grouped[houseName] || []).length > 0),
    [grouped, houseOrder]
  );

  return (
    <div
      className="min-h-screen py-6 px-4 sm:px-6 lg:px-8 starry-bg flex flex-col"
      style={{ background: "#1a1a2e" }}
    >
      <div className="max-w-6xl mx-auto w-full flex-1">
        <div className="absolute top-4 right-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-[#c9a227] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[#c9a227] transition hover:bg-[#c9a227] hover:text-[#1a1a2e]"
            style={{ fontFamily: "var(--font-cinzel), 'Cinzel', sans-serif" }}
          >
            Back to Leaderboard
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
            House MVPs
          </h1>
          <p
            className="italic text-lg sm:text-xl mt-3"
            style={{
              color: "#c9a227",
              fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
            }}
          >
            Top 5 students from each house
          </p>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-white text-lg">Loading House MVPs...</p>
          </div>
        ) : errorMessage ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-white text-lg">{errorMessage}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleHouses.length === 0 ? (
              <div className="col-span-2 flex items-center justify-center py-12">
                <p className="text-white text-lg">No MVPs found yet.</p>
              </div>
            ) : (
              visibleHouses.map((houseName) => {
              const config = houseConfig[houseName] || {
                color: "#333333",
                bgColor: "#f6f5f2",
                logo: null,
              };
              const houseStudents = grouped[houseName] || [];

              return (
                <div
                  key={houseName}
                  className="relative rounded-lg overflow-hidden shadow-lg float-card"
                  style={{
                    borderLeft: `5px solid ${config.color}`,
                    background: config.bgColor,
                  }}
                >
                  <div className="p-5 pr-28">
                    <h2
                      className="text-2xl font-bold mb-2"
                      style={{
                        color: config.color,
                        fontFamily:
                          "var(--font-playfair), 'Playfair Display', Georgia, serif",
                      }}
                    >
                      {houseName}
                    </h2>
                    <ol className="space-y-2">
                      {houseStudents.length === 0 ? (
                        <li
                          className="text-sm"
                          style={{
                            color: "#4a4a4a",
                            fontFamily:
                              "var(--font-cinzel), 'Cinzel', sans-serif",
                          }}
                        >
                          No MVPs found yet.
                        </li>
                      ) : (
                        houseStudents.slice(0, 5).map((student, index) => (
                          <li
                            key={`${houseName}-${student.studentName}-${index}`}
                            className="flex items-center justify-between text-sm"
                            style={{
                              color: "#1a1a2e",
                              fontFamily:
                                "var(--font-cinzel), 'Cinzel', sans-serif",
                            }}
                          >
                            <span>
                              {student.rank ?? index + 1}. {student.studentName}
                            </span>
                            <span className="font-semibold">
                              {student.points.toLocaleString()}
                            </span>
                          </li>
                        ))
                      )}
                    </ol>
                  </div>
                  {config.logo ? (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-20 h-20">
                      <Image
                        src={config.logo}
                        alt={`${houseName} Logo`}
                        width={80}
                        height={80}
                        className="object-contain"
                      />
                    </div>
                  ) : null}
                </div>
              );
            })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
