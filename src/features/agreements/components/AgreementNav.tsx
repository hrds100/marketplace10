import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const sections = [
  { id: 'overview', label: 'Overview' },
  { id: 'property', label: 'Deal Details' },
  { id: 'allocation', label: 'Allocation Terms' },
  { id: 'financials', label: 'Financial Projections' },
  { id: 'management', label: 'Management & Governance' },
  { id: 'risks', label: 'Risk Factors' },
  { id: 'obligations', label: 'Partner Obligations' },
  { id: 'tax', label: 'Tax Responsibility' },
  { id: 'disclaimer', label: 'Disclaimer' },
  { id: 'termination', label: 'Termination' },
  { id: 'governing-law', label: 'Governing Law' },
  { id: 'signature', label: 'Signature' },
];

export default function AgreementNav() {
  const [active, setActive] = useState('overview');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0.1 }
    );

    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <nav className="space-y-1">
      <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-3">
        Contents
      </p>
      {sections.map((s) => (
        <button
          key={s.id}
          onClick={() => scrollTo(s.id)}
          className={cn(
            'block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
            active === s.id
              ? 'bg-[#ECFDF5] text-[#1E9A80] font-medium'
              : 'text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F3F3EE]'
          )}
        >
          {s.label}
        </button>
      ))}
    </nav>
  );
}
