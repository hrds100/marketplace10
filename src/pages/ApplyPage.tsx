/**
 * ApplyPage — WhatsApp bridge landing at /apply
 *
 * Purpose: convert Facebook / Instagram ad traffic into direct WhatsApp
 * conversations for the Sales Closer role. No form. One CTA.
 *
 * Isolated page — no auth, no Supabase, no feature imports.
 */

import { useEffect } from 'react';

const WHATSAPP_URL =
  'https://wa.me/447414163669?text=Hi%20I%20want%20to%20apply%20for%20the%20Sales%20Closer%20role';

const pills = ['$1,000/month', 'Commission', 'Remote', '10am–7pm UK'];

export default function ApplyPage() {
  useEffect(() => {
    document.title = 'Sales Closer — nfstay';
  }, []);

  return (
    <main className="min-h-screen bg-[#F3F3EE] text-[#1A1A1A] antialiased">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col px-6 py-10 sm:px-8 sm:py-14">
        {/* Logo */}
        <header className="flex justify-center">
          <a
            href="https://hub.nfstay.com"
            className="inline-flex items-center gap-2 select-none"
            aria-label="nfstay"
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#0A0A0A] text-[#0A0A0A]"
              style={{ fontFamily: 'Sora, Inter, sans-serif', fontWeight: 700, fontSize: 14 }}
            >
              nf
            </span>
            <span
              className="text-[#0A0A0A]"
              style={{
                fontFamily: 'Sora, Inter, sans-serif',
                fontWeight: 400,
                fontSize: 18,
                letterSpacing: 2,
              }}
            >
              stay
            </span>
          </a>
        </header>

        {/* Hero */}
        <section className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="mt-12 sm:mt-16">
            <span className="inline-flex items-center rounded-full bg-[#ECFDF5] px-3.5 py-1.5 text-[11px] font-semibold tracking-wide text-[#1E9A80]">
              NOW HIRING
            </span>
          </div>

          <h1
            className="mt-6 text-[38px] font-bold leading-[1.1] tracking-[-0.02em] text-[#1A1A1A] sm:text-[46px] sm:leading-[1.05]"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            We’re hiring a Sales Closer
          </h1>

          <p className="mt-4 max-w-md text-[15px] leading-[1.55] text-[#6B7280] sm:text-[16px]">
            Remote role for a UK property rental platform.
          </p>

          {/* Pills */}
          <ul className="mt-8 flex flex-wrap justify-center gap-2">
            {pills.map((pill) => (
              <li
                key={pill}
                className="rounded-full border border-[#E8E5DF] bg-white px-3.5 py-1.5 text-[13px] font-medium text-[#1A1A1A] shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
              >
                {pill}
              </li>
            ))}
          </ul>

          {/* CTA */}
          <div className="mt-10 w-full sm:mt-12">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group mx-auto flex w-full max-w-sm items-center justify-center gap-2.5 rounded-[14px] bg-[#1E9A80] px-8 py-4 text-[16px] font-semibold text-white shadow-[0_4px_16px_rgba(30,154,128,0.35)] transition-transform duration-200 hover:-translate-y-[1px] hover:bg-[#1B8B74] active:translate-y-0"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5 fill-white"
                aria-hidden="true"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              Apply on WhatsApp
            </a>

            <p className="mt-3 text-[13px] text-[#737373]">
              Quick application, direct on WhatsApp
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-12 text-center text-[12px] text-[#9CA3AF] sm:mt-16">
          <p>We only use WhatsApp to reply to applicants. No spam.</p>
          <p className="mt-1">© nfstay · UK property rental platform</p>
        </footer>
      </div>
    </main>
  );
}
