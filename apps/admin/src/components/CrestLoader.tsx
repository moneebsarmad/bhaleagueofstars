'use client'

import { schoolConfig } from '@/lib/school.config'

type CrestLoaderProps = {
  label: string
}

export default function CrestLoader({ label }: CrestLoaderProps) {
  return (
    <div className="flex items-center justify-center h-64 pt-10 md:pt-14 lg:pt-16">
      <div className="text-center">
        <div className="flex items-center justify-center mx-auto mb-5 md:mb-6">
          <img src={schoolConfig.crestLogo} alt={`${schoolConfig.systemName} crest`} className="w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 object-contain animate-pulse" />
        </div>
        <div className="text-xl md:text-2xl font-semibold text-[#1a1a2e]" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
          {schoolConfig.systemName}
        </div>
        <div className="mt-2 md:mt-3 text-[10px] md:text-sm font-semibold tracking-[0.18em] md:tracking-[0.2em]">
          <span className="text-[#2f0a61]">Loyalty</span>
          <span className="text-[#1a1a2e]/40"> | </span>
          <span className="text-[#055437]">Wisdom</span>
          <span className="text-[#1a1a2e]/40"> | </span>
          <span className="text-[#000068]">Moral Courage</span>
          <span className="text-[#1a1a2e]/40"> | </span>
          <span className="text-[#910000]">Creativity</span>
        </div>
        <p className="text-[#1a1a2e]/60 font-medium">{label}</p>
      </div>
    </div>
  )
}
