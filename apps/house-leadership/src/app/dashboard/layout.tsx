"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import LoadingState from "@/components/LoadingState";
import { useAuth } from "../providers";
import { fetchLeadershipAssignment, fetchProfileRole } from "@/lib/houseLeadership";
import { useHouseSelection } from "@/lib/houseSelection";
import { canonicalHouseName, HOUSE_NAMES } from "@/lib/school.config";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [roleLabel, setRoleLabel] = useState("House Leader");
  const [displayName, setDisplayName] = useState("House Leadership");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const { house, setHouse } = useHouseSelection();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/");
      return;
    }

    const init = async () => {
      const role = await fetchProfileRole(user.id);
      const assignment = await fetchLeadershipAssignment(user.id);

      if (role === "super_admin") {
        setIsSuperAdmin(true);
        setRoleLabel("Super Admin");
        setDisplayName(user.email || "Super Admin");
        if (!house && HOUSE_NAMES.length > 0) {
          setHouse(HOUSE_NAMES[0]);
        }
        return;
      }

      if (!assignment) {
        router.push("/login");
        return;
      }

      setRoleLabel(assignment.role.replace("_", " ").toUpperCase());
      setDisplayName(assignment.display_name || assignment.email || "House Leader");
      if (!house || canonicalHouseName(house) !== assignment.house) {
        setHouse(assignment.house);
      }
    };

    init();
  }, [loading, user, router, house, setHouse]);

  const layoutReady = useMemo(() => Boolean(user && house), [user, house]);

  if (!layoutReady) {
    return <LoadingState label="Preparing house dashboard..." />;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar houseName={house || ""} roleLabel={roleLabel} />
      <main className="flex-1 bg-[#faf9f7]">
        <Topbar
          displayName={displayName}
          onHouseSwitch={isSuperAdmin ? setHouse : undefined}
          houseOptions={isSuperAdmin ? HOUSE_NAMES : undefined}
          currentHouse={house}
        />
        <div className="px-8 py-6">{children}</div>
      </main>
    </div>
  );
}
