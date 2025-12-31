"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import HouseCard from "@/components/HouseCard";

interface House {
    rank: number;
    name: string;
    virtue: string;
    description: string;
    points: number;
    color: string;
    bgColor: string;
    logo?: string | null;
  }

const houseConfig: Record<string, Omit<House, "rank" | "points" | "name">> = {
    "House of Abu Bakr": {
      virtue: "Loyalty",
      description: "Rooted in honesty, unwavering in loyalty to faith and community.",
      color: "#2f0a61",
      bgColor: "#f6f1fb",
      logo: "/house_of_abubakr.png",
    },
    "House of 'Umar": {
      virtue: "Moral Courage",
      description: "Living with fairness, speaking truth, and acting with courage.",
      color: "#000068",
      bgColor: "#f2f3fb",
      logo: "/house_of_umar.png",
    },
    "House of 'A'ishah": {
      virtue: "Creativity",
      description: "Igniting creativity that inspires hearts and serves Allah.",
      color: "#910000",
      bgColor: "#fdf1f1",
      logo: "/house_of_aishah.png",
    },
    "House of Khadijah": {
      virtue: "Wisdom",
      description: "Guided by wisdom, leading with grace and strength.",
      color: "#055437",
      bgColor: "#f1fbf6",
      logo: "/house_of_khadijah.png",
    },
  };

const fallbackHouses: House[] = [
    {
      rank: 1,
      name: "House of Abu Bakr",
      points: 4985,
      ...houseConfig["House of Abu Bakr"],
    },
    {
      rank: 2,
      name: "House of 'Umar",
      points: 4175,
      ...houseConfig["House of 'Umar"],
    },
    {
      rank: 3,
      name: "House of 'A'ishah",
      points: 3995,
      ...houseConfig["House of 'A'ishah"],
    },
    {
      rank: 4,
      name: "House of Khadijah",
      points: 3480,
      ...houseConfig["House of Khadijah"],
    },
  ];

export default function Home() {
  const [houses, setHouses] = useState<House[]>(fallbackHouses);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);

  useEffect(() => {
    async function fetchHouses() {
      if (fetchingRef.current) {
        return;
      }
      fetchingRef.current = true;
      try {
        const { data, error } = await supabase
          .from("house_standings_view")
          .select("*")
          .order("total_points", { ascending: false });

        if (error) {
          console.error("Supabase error:", error);
          setHouses(fallbackHouses);
          return;
        }

        const mapped =
          data?.map((row: Record<string, unknown>, index: number) => {
            const houseNameRaw = row.house_name ?? row.name ?? "";
            const houseName = String(houseNameRaw ?? "").trim();
            const config = houseConfig[houseName];
            if (!config) {
              return null;
            }
            const pointsValue =
              Number(row.total_points ?? row.points ?? 0) || 0;
            return {
              rank: index + 1,
              name: houseName,
              points: pointsValue,
              ...config,
            };
          }) ?? [];

        const valid = mapped.filter(Boolean) as House[];
        setHouses(valid.length > 0 ? valid : fallbackHouses);
      } catch (err) {
        console.error("Error fetching houses:", err);
        setHouses(fallbackHouses);
      } finally {
        setLoading(false);
        fetchingRef.current = false;
      }
    }

    fetchHouses();

    const channel = supabase
      .channel("leaderboard-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "merit_log" },
        () => {
          fetchHouses();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        () => {
          fetchHouses();
        }
      )
      .subscribe();

    const refreshInterval = setInterval(fetchHouses, 30000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchHouses();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(refreshInterval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return (
    <div className="h-screen py-4 px-4 sm:px-6 lg:px-8 starry-bg flex flex-col" style={{ background: "#1a1a2e" }}>
      {/* School Branding */}
      <div
        className="absolute top-4 left-6 text-sm tracking-wide"
        style={{
          color: "#c9a227",
          fontFamily: "var(--font-cinzel), 'Cinzel', sans-serif"
        }}
      >
        Brighter Horizon Academy
      </div>
      <div className="absolute top-4 right-6 flex items-center gap-2">
        <Link
          href="/house-mvps"
          className="inline-flex items-center gap-2 rounded-full border border-[#c9a227] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[#c9a227] transition hover:bg-[#c9a227] hover:text-[#1a1a2e]"
          style={{ fontFamily: "var(--font-cinzel), 'Cinzel', sans-serif" }}
        >
          House MVPs
        </Link>
        <Link
          href="/hall-of-fame"
          className="inline-flex items-center gap-2 rounded-full border border-[#c9a227] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[#c9a227] transition hover:bg-[#c9a227] hover:text-[#1a1a2e]"
          style={{ fontFamily: "var(--font-cinzel), 'Cinzel', sans-serif" }}
        >
          Hall of Fame
        </Link>
      </div>

      <div className="max-w-6xl mx-auto w-full flex flex-col flex-1">
        {/* Header with Crest */}
        <header className="text-center mb-4">
          {/* Crest */}
          <div className="flex justify-center mb-2">
            <Image
              src="/crest.png"
              alt="League of Stars Crest"
              width={100}
              height={100}
              className="drop-shadow-lg"
              priority
            />
          </div>

          {/* Title */}
          <h1
            className="italic text-3xl sm:text-4xl md:text-5xl text-white mb-2 gold-underline pb-1"
            style={{ fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif" }}
          >
            League of Stars Leaderboard
          </h1>

          {/* Tagline */}
          <p
            className="italic text-lg sm:text-xl mt-3"
            style={{
              color: "#c9a227",
              fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif"
            }}
          >
            Where Stars Are Made
          </p>

        </header>

        {/* Leaderboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {loading ? (
            <div className="col-span-2 flex items-center justify-center py-12">
              <p className="text-white text-lg">Loading...</p>
            </div>
          ) : (
            houses.map((house) => (
              <HouseCard key={house.name} house={house} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
