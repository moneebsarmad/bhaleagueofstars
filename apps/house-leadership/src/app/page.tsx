"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { schoolConfig } from "@/lib/school.config";

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="auth-page">
      <div className="auth-background">
        <div className="auth-star auth-star-top">
          <svg viewBox="0 0 200 200">
            <path d="M100,10 L120,80 L190,80 L130,120 L150,190 L100,150 L50,190 L70,120 L10,80 L80,80 Z" />
          </svg>
        </div>
        <div className="auth-star auth-star-bottom">
          <svg viewBox="0 0 200 200">
            <path d="M100,10 L120,80 L190,80 L130,120 L150,190 L100,150 L50,190 L70,120 L10,80 L80,80 Z" />
          </svg>
        </div>
        <div className="auth-orb auth-orb-purple"></div>
        <div className="auth-orb auth-orb-gold"></div>
      </div>

      <div className="auth-shell">
        <div className="auth-line"></div>
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <div className="auth-logo-inner">
                <img src={schoolConfig.crestLogo} alt={`${schoolConfig.systemName} crest`} />
              </div>
              <span className="auth-logo-glow"></span>
            </div>
            <h1>{schoolConfig.systemName}</h1>
            <p>House Leadership</p>
          </div>

          <div className="auth-divider"></div>

          <div className="house-grid">
            {schoolConfig.houses.map((house) => (
              <button
                key={house.name}
                onClick={() => router.push(`/login?house=${encodeURIComponent(house.name)}`)}
                className="house-option"
              >
                <span className="house-icon" style={{ background: house.accentGradient }}>
                  <img src={house.logo} alt={house.name} />
                </span>
                <span>
                  <span className="house-option-title">{house.name}</span>
                  <span className="house-option-sub">Mentors • Captains • Vice Captains</span>
                </span>
              </button>
            ))}
          </div>

          <div className="auth-footer">
            <span className="auth-dot"></span>
            {schoolConfig.schoolName}
          </div>
        </div>
        <div className="auth-line"></div>
      </div>
    </div>
  );
}
