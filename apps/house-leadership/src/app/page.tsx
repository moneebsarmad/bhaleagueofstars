"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { schoolConfig } from "@/lib/school.config";

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen pattern-bg flex flex-col items-center justify-center px-6 py-12">
      <div className="text-center mb-10">
        <div className="flex justify-center mb-4">
          <Image
            src={schoolConfig.crestLogo}
            alt={`${schoolConfig.systemName} crest`}
            width={96}
            height={96}
            className="object-contain"
          />
        </div>
        <h1 className="text-4xl font-semibold text-[#1a1a2e]">{schoolConfig.systemName}</h1>
        <p className="text-lg text-[#1a1a2e]/60 mt-2">{schoolConfig.tagline}</p>
        <div className="flex justify-center mt-4">
          <div className="gold-rule"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-3xl">
        {schoolConfig.houses.map((house) => (
          <button
            key={house.name}
            onClick={() => router.push(`/login?house=${encodeURIComponent(house.name)}`)}
            className="card px-6 py-5 text-left hover:-translate-y-1 transition"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl p-2 shadow-md" style={{ background: house.accentGradient }}>
                <Image src={house.logo} alt={house.name} width={64} height={64} className="object-contain" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[#1a1a2e]/40">House Login</p>
                <p className="text-xl font-semibold text-[#1a1a2e]">{house.name}</p>
                <p className="text-sm text-[#1a1a2e]/50 mt-1">Mentors • Captains • Vice Captains</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
