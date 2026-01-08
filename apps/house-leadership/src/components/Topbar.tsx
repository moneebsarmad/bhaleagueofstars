import { useMemo } from "react";
import { useAuth } from "@/app/providers";

type TopbarProps = {
  displayName: string;
  onHouseSwitch?: (house: string) => void;
  houseOptions?: string[];
  currentHouse?: string | null;
};

export default function Topbar({ displayName, onHouseSwitch, houseOptions, currentHouse }: TopbarProps) {
  const { signOut } = useAuth();
  const dateLabel = useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    []
  );

  return (
    <header className="flex items-center justify-between py-4 px-8 border-b border-[#c9a227]/10 bg-white/80 backdrop-blur-md sticky top-0 z-20">
      <div className="flex items-center gap-3 text-sm text-[#1a1a2e]/60">
        <span className="w-2 h-2 rounded-full bg-[#c9a227]"></span>
        <span>{dateLabel}</span>
      </div>

      <div className="flex items-center gap-4">
        {houseOptions && currentHouse && onHouseSwitch && (
          <select
            value={currentHouse}
            onChange={(event) => onHouseSwitch(event.target.value)}
            className="px-3 py-2 rounded-lg border border-[#1a1a2e]/10 text-sm text-[#1a1a2e]"
          >
            {houseOptions.map((house) => (
              <option key={house} value={house}>
                {house}
              </option>
            ))}
          </select>
        )}
        <div className="text-right">
          <p className="text-sm font-semibold text-[#1a1a2e]">{displayName}</p>
          <p className="text-xs text-[#1a1a2e]/50">House Leadership</p>
        </div>
        <button
          onClick={signOut}
          className="text-sm text-[#1a1a2e]/50 hover:text-[#910000] transition"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
