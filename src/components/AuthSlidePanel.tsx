import { useState, useEffect, useCallback } from 'react';

const SLIDES = [
  {
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=1200&fit=crop',
    headline: 'From landlord listing to first booking',
    body: 'nfstay connects you with verified rent-to-rent deals across the UK. Find, negotiate, and launch your Airbnb in days.',
    type: 'stats' as const,
    stats: [
      { number: '1,800+', label: 'Verified deals' },
      { number: '4,200+', label: 'Active operators' },
    ],
  },
  {
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=1200&fit=crop',
    headline: 'Built-in CRM. Deal pipeline. University.',
    body: 'Everything you need to manage your rent-to-rent portfolio in one platform.',
    type: 'bullets' as const,
    bullets: [
      'Track deals from inquiry to keys',
      'WhatsApp-first landlord communication',
      'Step-by-step Airbnb University courses',
    ],
  },
  {
    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=1200&fit=crop',
    headline: 'Trusted by UK operators since 2024',
    body: 'Join the fastest-growing rent-to-rent community. Fully authorised properties, ready for Airbnb income.',
    type: 'avatars' as const,
    avatars: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=96&h=96&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&fit=crop&crop=face',
    ],
    avatarLabel: '4,200+ operators trust nfstay',
  },
];

export default function AuthSlidePanel() {
  const [active, setActive] = useState(0);

  const next = useCallback(() => {
    setActive((prev) => (prev + 1) % SLIDES.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [next]);

  return (
    <div data-feature="AUTH" className="relative w-1/2 h-full overflow-hidden rounded-3xl hidden lg:flex flex-shrink-0">
      {/* Slides */}
      {SLIDES.map((slide, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-opacity duration-500"
          style={{ opacity: i === active ? 1 : 0 }}
        >
          <img
            src={slide.image}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      ))}

      {/* Gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, #041613 0%, rgba(4,22,19,0.60) 50%, transparent 100%)',
        }}
      />

      {/* Content */}
      <div className="relative flex flex-col justify-end w-full h-full">
        {SLIDES.map((slide, i) => (
          <div
            key={i}
            className="absolute inset-0 flex flex-col justify-end transition-opacity duration-500"
            style={{ opacity: i === active ? 1 : 0 }}
          >
            <div className="flex flex-col gap-3 px-10 pb-20 pt-16">
              <h2 className="text-[36px] font-semibold leading-tight tracking-tight text-white">
                {slide.headline}
              </h2>
              <p className="text-base leading-relaxed tracking-wide text-[#e8ebe6]">
                {slide.body}
              </p>

              {/* Stats (slide 1) */}
              {slide.type === 'stats' && slide.stats && (
                <div className="flex gap-8 mt-1">
                  {slide.stats.map((s, j) => (
                    <div key={j}>
                      <p className="text-2xl font-semibold leading-8 text-white">{s.number}</p>
                      <p className="text-base tracking-wide text-[#e8ebe6]/70">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Bullets (slide 2) */}
              {slide.type === 'bullets' && slide.bullets && (
                <ul className="flex flex-col gap-2 mt-1">
                  {slide.bullets.map((b, j) => (
                    <li key={j} className="text-base leading-relaxed tracking-wide text-[#e8ebe6] flex items-center gap-2">
                      <svg className="w-4 h-4 text-[#1e9a80] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {b}
                    </li>
                  ))}
                </ul>
              )}

              {/* Avatars (slide 3) */}
              {slide.type === 'avatars' && slide.avatars && (
                <div className="mt-2">
                  <div className="flex -space-x-2">
                    {slide.avatars.map((src, j) => (
                      <img key={j} src={src} alt="" className="w-10 h-10 rounded-full border-2 border-white/20 object-cover" />
                    ))}
                  </div>
                  <p className="text-sm font-medium text-white/60 mt-2">{slide.avatarLabel}</p>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Dot indicators */}
        <div className="relative flex gap-3 px-6 py-6" style={{ backdropFilter: 'blur(4px)' }}>
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className="h-0.5 flex-1 rounded-sm transition-colors duration-300 cursor-pointer"
              style={{ backgroundColor: i === active ? '#ffffff' : 'rgba(255,255,255,0.35)' }}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
