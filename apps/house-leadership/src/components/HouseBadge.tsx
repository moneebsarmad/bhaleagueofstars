import Image from "next/image";
import { HouseConfig } from "@/lib/school.config";

type HouseBadgeProps = {
  house: HouseConfig;
  size?: "sm" | "md";
};

export default function HouseBadge({ house, size = "md" }: HouseBadgeProps) {
  const dimensions = size === "sm" ? 40 : 56;
  return (
    <div className="flex items-center gap-3">
      <div
        className="rounded-2xl p-2 shadow-md border border-white/40"
        style={{ background: house.accentGradient }}
      >
        <Image
          src={house.logo}
          alt={house.name}
          width={dimensions}
          height={dimensions}
          className="object-contain"
        />
      </div>
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-[#c9a227] font-semibold">House</p>
        <p className="text-xl font-semibold text-[#1a1a2e]">{house.name}</p>
      </div>
    </div>
  );
}
