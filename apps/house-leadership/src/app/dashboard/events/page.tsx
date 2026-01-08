"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { canonicalHouseName } from "@/lib/school.config";
import { useHouseSelection } from "@/lib/houseSelection";
import LoadingState from "@/components/LoadingState";

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
};

export default function EventsPage() {
  const { house } = useHouseSelection();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<"active" | "completed">("active");
  const [message, setMessage] = useState<string | null>(null);

  const fetchEvents = async (houseName: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("house_events")
      .select("id, title, description, start_date, end_date, status")
      .eq("house", houseName)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error loading events:", error.message);
    }
    setEvents((data || []) as EventRow[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!house) return;
    fetchEvents(canonicalHouseName(house));
  }, [house]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!house) return;
    setMessage(null);
    const { error } = await supabase.from("house_events").insert([
      {
        house: canonicalHouseName(house),
        title,
        description,
        start_date: startDate || null,
        end_date: endDate || null,
        status,
      },
    ]);

    if (error) {
      console.error("Error creating event:", error.message);
      setMessage("Could not create event. Please try again.");
      return;
    }

    setTitle("");
    setDescription("");
    setStartDate("");
    setEndDate("");
    setStatus("active");
    setMessage("Event created.");
    fetchEvents(canonicalHouseName(house));
  };

  if (loading || !house) {
    return <LoadingState label="Loading events..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-[#1a1a2e]/40">Events & Challenges</p>
        <h1 className="text-2xl font-semibold text-[#1a1a2e]">Build House Camaraderie</h1>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-[#1a1a2e] mb-4">Create Event</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Event title"
            className="px-4 py-3 rounded-xl border border-[#1a1a2e]/10"
            required
          />
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as "active" | "completed")}
            className="px-4 py-3 rounded-xl border border-[#1a1a2e]/10"
          >
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="px-4 py-3 rounded-xl border border-[#1a1a2e]/10"
          />
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="px-4 py-3 rounded-xl border border-[#1a1a2e]/10"
          />
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Describe the challenge or event..."
            className="md:col-span-2 px-4 py-3 rounded-xl border border-[#1a1a2e]/10"
            rows={3}
          />
          <div className="md:col-span-2 flex items-center justify-between">
            {message && <p className="text-sm text-[#055437]">{message}</p>}
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-[#1a1a2e] text-white font-semibold"
            >
              Create
            </button>
          </div>
        </form>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-[#1a1a2e] mb-4">House Events</h2>
        {events.length === 0 ? (
          <p className="text-sm text-[#1a1a2e]/50">No events yet.</p>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <div key={event.id} className="border border-[#1a1a2e]/10 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-[#1a1a2e]">{event.title}</h3>
                  <span className="text-xs uppercase tracking-[0.2em] text-[#c9a227]">{event.status}</span>
                </div>
                {event.description && <p className="text-sm text-[#1a1a2e]/60 mt-2">{event.description}</p>}
                <p className="text-xs text-[#1a1a2e]/40 mt-3">
                  {event.start_date || "TBD"} {event.end_date ? `→ ${event.end_date}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
