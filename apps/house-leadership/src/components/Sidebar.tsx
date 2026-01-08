import Link from "next/link";
import Image from "next/image";
import { schoolConfig } from "@/lib/school.config";

type SidebarProps = {
  houseName: string;
  roleLabel: string;
};

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/students", label: "Students" },
  { href: "/dashboard/staff", label: "Staff Engagement" },
  { href: "/dashboard/events", label: "Events & Challenges" },
  { href: "/dashboard/analytics", label: "Analytics" },
  { href: "/dashboard/search", label: "Search" },
  { href: "/dashboard/announcements", label: "Announcements" },
];

export default function Sidebar({ houseName, roleLabel }: SidebarProps) {
  return (
    <aside className="w-72 bg-gradient-to-b from-[#1a1a2e] to-[#111124] text-white min-h-screen px-6 py-8">
      <div className="flex items-center gap-3 mb-10">
        <Image
          src={schoolConfig.crestLogo}
          alt={`${schoolConfig.systemName} crest`}
          width={48}
          height={48}
          className="object-contain"
        />
        <div>
          <p className="text-lg font-semibold">{schoolConfig.systemName}</p>
          <p className="text-sm text-[#c9a227]/80">House Leadership</p>
        </div>
      </div>

      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">House</p>
        <p className="text-base font-semibold">{houseName}</p>
        <p className="text-xs text-[#c9a227]/80 mt-1">{roleLabel}</p>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block px-4 py-2 rounded-xl text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
