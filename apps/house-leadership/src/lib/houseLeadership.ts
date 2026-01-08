import { supabase } from "./supabaseClient";
import { canonicalHouseName } from "./school.config";

export type LeadershipRole = "mentor" | "captain" | "vice_captain";

export type LeadershipAssignment = {
  house: string;
  role: LeadershipRole;
  display_name: string | null;
  email: string | null;
};

export async function fetchProfileRole(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching profile role:", error.message);
    return null;
  }
  return data?.role ?? null;
}

export async function fetchLeadershipAssignment(userId: string) {
  const { data, error } = await supabase
    .from("house_leadership")
    .select("house, role, display_name, email")
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    console.error("Error fetching leadership assignment:", error.message);
    return null;
  }

  if (!data?.house) return null;
  return {
    house: canonicalHouseName(data.house),
    role: data.role as LeadershipRole,
    display_name: data.display_name ?? null,
    email: data.email ?? null,
  } satisfies LeadershipAssignment;
}
