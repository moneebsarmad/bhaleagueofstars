'use client'

type CrestLoaderProps = {
  label: string
}

export default function CrestLoader({ label }: CrestLoaderProps) {
  return (
    <div className="flex items-center justify-center h-64 pt-10 md:pt-14 lg:pt-16">
      <div className="text-center">
        <div className="w-40 h-40 md:w-52 md:h-52 lg:w-56 lg:h-56 rounded-full bg-white shadow-md border border-[#c9a227]/30 flex items-center justify-center mx-auto mb-5 md:mb-6 animate-pulse">
          <img src="/crest.png" alt="League of Stars crest" className="w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 object-contain" />
        </div>
        <div className="text-xl md:text-2xl font-semibold text-[#1a1a2e]" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
          League of Stars
        </div>
        <div className="mt-2 md:mt-3 text-[10px] md:text-sm font-semibold uppercase tracking-[0.18em] md:tracking-[0.2em]">
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
