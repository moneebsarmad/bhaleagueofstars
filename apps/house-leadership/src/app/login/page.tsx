"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../providers";
import { fetchLeadershipAssignment, fetchProfileRole } from "@/lib/houseLeadership";
import { canonicalHouseName, getHouseConfigRecord, schoolConfig } from "@/lib/school.config";
import { useHouseSelection } from "@/lib/houseSelection";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, signIn, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedHouse = searchParams.get("house") || "";
  const { setHouse } = useHouseSelection(selectedHouse);
  const houseConfig = getHouseConfigRecord();
  const selectedConfig = houseConfig[canonicalHouseName(selectedHouse)] || schoolConfig.houses[0];

  useEffect(() => {
    if (!selectedHouse) return;
    setHouse(selectedHouse);
  }, [selectedHouse, setHouse]);

  useEffect(() => {
    if (loading || !user) return;

    const verifyAccess = async () => {
      const role = await fetchProfileRole(user.id);
      if (role === "super_admin") {
        router.push("/dashboard");
        return;
      }

      const assignment = await fetchLeadershipAssignment(user.id);
      if (!assignment) {
        setError("Access denied. You are not assigned to a house leadership role.");
        await signOut();
        return;
      }

      if (selectedHouse && canonicalHouseName(selectedHouse) !== assignment.house) {
        setError("Access denied. Please login through your assigned house.");
        await signOut();
        return;
      }

      setHouse(assignment.house);
      router.push("/dashboard");
    };

    verifyAccess();
  }, [loading, user, router, selectedHouse, setHouse, signOut]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const signInError = await signIn(email, password);
    if (signInError) {
      setError(signInError);
    }
    setIsSubmitting(false);
  };

  const houseLabel = useMemo(() => selectedConfig?.name || "House Login", [selectedConfig]);

  return (
    <div className="min-h-screen pattern-bg flex items-center justify-center px-6">
      <div className="card w-full max-w-lg p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl p-2 shadow-md" style={{ background: selectedConfig.accentGradient }}>
            <Image src={selectedConfig.logo} alt={houseLabel} width={64} height={64} className="object-contain" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#1a1a2e]/40">House Leadership</p>
            <h1 className="text-2xl font-semibold text-[#1a1a2e]">{houseLabel}</h1>
          </div>
        </div>

        <p className="text-sm text-[#1a1a2e]/60 mb-6">
          Log in to view your house performance, students, and engagement metrics.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-[#1a1a2e]/10"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-[#1a1a2e]/10"
            required
          />
          {error && <p className="text-sm text-[#910000]">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#2f0a61] to-[#1a0536] text-white font-semibold disabled:opacity-60"
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
