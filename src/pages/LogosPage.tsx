/**
 * LogosPage — 60 black logo concepts for nfstay brand exploration.
 * Public route at /logos. Hugo picks favourites by number.
 */
export default function LogosPage() {
  return (
    <div style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", background: '#fafafa', color: '#111', minHeight: '100vh', padding: '40px 20px' }}>
      {/* Google Fonts for all variations */}
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=DM+Sans:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700;800&family=Sora:wght@300;400;500;600;700;800&family=Manrope:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@300;400;500;600;700&family=Instrument+Sans:wght@400;500;600;700&family=Bricolage+Grotesque:wght@300;400;500;600;700;800&family=Nunito+Sans:ital,wght@0,400;0,600;0,700;0,800;1,400;1,700&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,700&family=Poppins:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&display=swap"
        rel="stylesheet"
      />

      <style>{`
        .logo-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 24px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .logo-card {
          background: #fff;
          border: 1px solid #e5e5e5;
          border-radius: 16px;
          padding: 48px 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 200px;
          position: relative;
          transition: border-color 0.2s, box-shadow 0.2s;
          cursor: pointer;
        }
        .logo-card:hover {
          border-color: #111;
          box-shadow: 0 4px 24px rgba(0,0,0,0.06);
        }
        .logo-card .num {
          position: absolute;
          top: 12px;
          left: 16px;
          font-size: 12px;
          font-weight: 600;
          color: #999;
          background: #f5f5f5;
          padding: 2px 8px;
          border-radius: 6px;
          font-family: 'Inter', sans-serif;
        }
        .logo-card .cat {
          position: absolute;
          top: 12px;
          right: 16px;
          font-size: 10px;
          font-weight: 500;
          color: #aaa;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-family: 'Inter', sans-serif;
        }
        .section-label {
          grid-column: 1 / -1;
          font-size: 13px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #999;
          padding: 24px 0 0;
          border-top: 1px solid #e5e5e5;
          margin-top: 16px;
          font-family: 'Inter', sans-serif;
        }
        @media (max-width: 680px) {
          .logo-grid { grid-template-columns: 1fr; }
          .logo-card { padding: 40px 24px; }
        }
      `}</style>

      {/* Header */}
      <div style={{ maxWidth: 800, margin: '0 auto 48px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, letterSpacing: -0.5 }}>nfstay — Logo Picker</h1>
        <p style={{ fontSize: 15, color: '#666', lineHeight: 1.5 }}>60 options, all black, clean &amp; minimal. Just say the number you like (e.g. "I like #14").</p>
      </div>

      <div className="logo-grid">

        {/* ═══════════════════════════════════════════════════════ */}
        {/* ORIGINAL 30 (#1–#30)                                   */}
        {/* ═══════════════════════════════════════════════════════ */}

        {/* --- SECTION: nfstay (one word) --- */}
        <div className="section-label">nfstay — one word, lowercase</div>

        <Card n={1} cat="Inter Bold">
          <span style={{ fontFamily: "'Inter'", fontSize: 42, fontWeight: 700, letterSpacing: -1.5 }}>nfstay</span>
        </Card>
        <Card n={2} cat="Inter Light">
          <span style={{ fontFamily: "'Inter'", fontSize: 42, fontWeight: 300, letterSpacing: 4 }}>nfstay</span>
        </Card>
        <Card n={3} cat="Outfit Heavy">
          <span style={{ fontFamily: "'Outfit'", fontSize: 44, fontWeight: 800, letterSpacing: -2 }}>nfstay</span>
        </Card>
        <Card n={4} cat="DM Sans Medium">
          <span style={{ fontFamily: "'DM Sans'", fontSize: 40, fontWeight: 500, letterSpacing: 2 }}>nfstay</span>
        </Card>
        <Card n={5} cat="Sora Semi">
          <span style={{ fontFamily: "'Sora'", fontSize: 38, fontWeight: 600, letterSpacing: -0.5 }}>nfstay</span>
        </Card>

        {/* --- SECTION: nf stay (two words) --- */}
        <div className="section-label">nf stay — two words (your preference)</div>

        <Card n={6} cat="Inter Bold+Regular">
          <span style={{ fontFamily: "'Inter'", fontSize: 42, letterSpacing: -1 }}>
            <span style={{ fontWeight: 800 }}>nf</span>&nbsp;<span style={{ fontWeight: 400 }}>stay</span>
          </span>
        </Card>
        <Card n={7} cat="Inter Light Spaced">
          <span style={{ fontFamily: "'Inter'", fontSize: 42, fontWeight: 300, letterSpacing: 3 }}>nf stay</span>
        </Card>
        <Card n={8} cat="Outfit Bold+Light">
          <span style={{ fontFamily: "'Outfit'", fontSize: 44, letterSpacing: -1.5 }}>
            <span style={{ fontWeight: 800 }}>nf</span>&nbsp;<span style={{ fontWeight: 300 }}>stay</span>
          </span>
        </Card>
        <Card n={9} cat="Manrope Bold">
          <span style={{ fontFamily: "'Manrope'", fontSize: 40, letterSpacing: -0.5 }}>
            <span style={{ fontWeight: 800 }}>nf</span>&nbsp;<span style={{ fontWeight: 400 }}>stay</span>
          </span>
        </Card>
        <Card n={10} cat="Sora Wide">
          <span style={{ fontFamily: "'Sora'", fontSize: 36, fontWeight: 400, letterSpacing: 6 }}>nf stay</span>
        </Card>

        {/* --- SECTION: nf.stay --- */}
        <div className="section-label">nf.stay — dot separator</div>

        <Card n={11} cat="Inter Bold">
          <span style={{ fontFamily: "'Inter'", fontSize: 42, fontWeight: 700, letterSpacing: -1 }}>nf.stay</span>
        </Card>
        <Card n={12} cat="Inter Light">
          <span style={{ fontFamily: "'Inter'", fontSize: 40, fontWeight: 300, letterSpacing: 2 }}>nf.stay</span>
        </Card>
        <Card n={13} cat="Outfit Heavy">
          <span style={{ fontFamily: "'Outfit'", fontSize: 44, fontWeight: 800, letterSpacing: -1 }}>nf.stay</span>
        </Card>
        <Card n={14} cat="Manrope Semi">
          <span style={{ fontFamily: "'Manrope'", fontSize: 38, fontWeight: 600, letterSpacing: 1 }}>nf.stay</span>
        </Card>

        {/* --- SECTION: n.f.stay --- */}
        <div className="section-label">n.f.stay — full dots</div>

        <Card n={15} cat="Inter Semi">
          <span style={{ fontFamily: "'Inter'", fontSize: 40, fontWeight: 600 }}>n.f.stay</span>
        </Card>
        <Card n={16} cat="DM Sans Light">
          <span style={{ fontFamily: "'DM Sans'", fontSize: 38, fontWeight: 300, letterSpacing: 3 }}>n.f.stay</span>
        </Card>
        <Card n={17} cat="Sora Bold">
          <span style={{ fontFamily: "'Sora'", fontSize: 36, fontWeight: 700, letterSpacing: -0.5 }}>n.f.stay</span>
        </Card>

        {/* --- SECTION: NF Stay — title case --- */}
        <div className="section-label">NF Stay — title case</div>

        <Card n={18} cat="Inter Bold">
          <span style={{ fontFamily: "'Inter'", fontSize: 42, fontWeight: 700, letterSpacing: -1 }}>NF Stay</span>
        </Card>
        <Card n={19} cat="Outfit Light Wide">
          <span style={{ fontFamily: "'Outfit'", fontSize: 40, fontWeight: 300, letterSpacing: 5 }}>NF Stay</span>
        </Card>
        <Card n={20} cat="Manrope Extra Bold">
          <span style={{ fontFamily: "'Manrope'", fontSize: 40, fontWeight: 800, letterSpacing: -1 }}>NF Stay</span>
        </Card>

        {/* --- SECTION: Weight contrast --- */}
        <div className="section-label">nf + stay — weight contrast pairs</div>

        <Card n={21} cat="Inter Black+Light">
          <span style={{ fontFamily: "'Inter'", fontSize: 44, letterSpacing: -1 }}>
            <span style={{ fontWeight: 900 }}>nf</span><span style={{ fontWeight: 300 }}>stay</span>
          </span>
        </Card>
        <Card n={22} cat="Outfit Bold+Light">
          <span style={{ fontFamily: "'Outfit'", fontSize: 44, letterSpacing: -1.5 }}>
            <span style={{ fontWeight: 800 }}>nf</span><span style={{ fontWeight: 300 }}>stay</span>
          </span>
        </Card>
        <Card n={23} cat="Sora Bold + Spaced Light">
          <span style={{ fontFamily: "'Sora'", fontSize: 40 }}>
            <span style={{ fontWeight: 800 }}>nf</span>&nbsp;<span style={{ fontWeight: 300, letterSpacing: 3 }}>stay</span>
          </span>
        </Card>
        <Card n={24} cat="Manrope + Divider Line">
          <span style={{ fontFamily: "'Manrope'", fontSize: 42, letterSpacing: -0.5, display: 'flex', alignItems: 'center' }}>
            <span style={{ fontWeight: 800 }}>nf</span>
            <span style={{ width: 1, height: 28, background: '#111', margin: '0 12px', display: 'inline-block' }} />
            <span style={{ fontWeight: 300 }}>stay</span>
          </span>
        </Card>

        {/* --- SECTION: Icon + text --- */}
        <div className="section-label">Icon + text combos</div>

        <Card n={25} cat="House outline + Inter">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 18L18 6L31 18" /><path d="M9 15V30H27V15" />
            </svg>
            <span style={{ fontFamily: "'Inter'", fontSize: 36, fontWeight: 700, letterSpacing: -1 }}>nf stay</span>
          </div>
        </Card>
        <Card n={26} cat="Key outline + Outfit">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="7" /><path d="M17 17L28 28" /><path d="M24 24L28 20" /><path d="M21 21L25 17" />
            </svg>
            <span style={{ fontFamily: "'Outfit'", fontSize: 34, fontWeight: 600 }}>nf stay</span>
          </div>
        </Card>
        <Card n={27} cat="Door outline + Sora">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg width="28" height="36" viewBox="0 0 28 36" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="24" height="32" rx="3" /><circle cx="20" cy="19" r="1.5" fill="#111" />
            </svg>
            <span style={{ fontFamily: "'Sora'", fontSize: 32, fontWeight: 400, letterSpacing: 3 }}>nf stay</span>
          </div>
        </Card>

        {/* --- SECTION: Monograms --- */}
        <div className="section-label">Monogram + wordmark</div>

        <Card n={28} cat="Circle monogram + Inter">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 52, height: 52, border: '2.5px solid #111', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter'", fontWeight: 800, fontSize: 22 }}>nf</div>
            <span style={{ fontFamily: "'Inter'", fontSize: 32, fontWeight: 300, letterSpacing: 3 }}>stay</span>
          </div>
        </Card>
        <Card n={29} cat="Rounded square + Outfit">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 52, height: 52, border: '2.5px solid #111', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit'", fontWeight: 800, fontSize: 22 }}>nf</div>
            <span style={{ fontFamily: "'Outfit'", fontSize: 34, fontWeight: 700, letterSpacing: -1 }}>stay</span>
          </div>
        </Card>
        <Card n={30} cat="Filled badge + Manrope">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 52, height: 52, background: '#111', color: '#fff', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Manrope'", fontWeight: 800, fontSize: 22 }}>nf</div>
            <span style={{ fontFamily: "'Manrope'", fontSize: 32, fontWeight: 500, letterSpacing: 1 }}>stay</span>
          </div>
        </Card>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* NEW 30 (#31–#60) — CREATIVE EXPLORATIONS              */}
        {/* ═══════════════════════════════════════════════════════ */}

        {/* --- SECTION: Stacked / Vertical layouts --- */}
        <div className="section-label">Stacked — vertical layouts</div>

        <Card n={31} cat="Inter Stacked Bold">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1, fontFamily: "'Inter'" }}>
            <span style={{ fontSize: 48, fontWeight: 900, letterSpacing: -2 }}>nf</span>
            <span style={{ fontSize: 28, fontWeight: 300, letterSpacing: 6, marginTop: -2 }}>stay</span>
          </div>
        </Card>
        <Card n={32} cat="Outfit Stacked Tight">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 0.85, fontFamily: "'Outfit'" }}>
            <span style={{ fontSize: 56, fontWeight: 800, letterSpacing: -3 }}>nf</span>
            <span style={{ fontSize: 20, fontWeight: 400, letterSpacing: 8, textTransform: 'uppercase' }}>stay</span>
          </div>
        </Card>
        <Card n={33} cat="Space Grotesk Stacked">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1, fontFamily: "'Space Grotesk'" }}>
            <span style={{ fontSize: 44, fontWeight: 700, letterSpacing: -1.5 }}>nf</span>
            <span style={{ fontSize: 44, fontWeight: 300, letterSpacing: -1.5, marginTop: -8 }}>stay</span>
          </div>
        </Card>
        <Card n={34} cat="Manrope Stacked Line">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: "'Manrope'" }}>
            <span style={{ fontSize: 36, fontWeight: 800, letterSpacing: 2 }}>NF</span>
            <div style={{ width: 40, height: 1.5, background: '#111', margin: '6px 0' }} />
            <span style={{ fontSize: 18, fontWeight: 400, letterSpacing: 8 }}>STAY</span>
          </div>
        </Card>

        {/* --- SECTION: All-caps treatments --- */}
        <div className="section-label">ALL CAPS — bold & architectural</div>

        <Card n={35} cat="Inter Caps Tight">
          <span style={{ fontFamily: "'Inter'", fontSize: 44, fontWeight: 900, letterSpacing: -2, textTransform: 'uppercase' }}>nfstay</span>
        </Card>
        <Card n={36} cat="Space Grotesk Caps Wide">
          <span style={{ fontFamily: "'Space Grotesk'", fontSize: 32, fontWeight: 500, letterSpacing: 10, textTransform: 'uppercase' }}>nfstay</span>
        </Card>
        <Card n={37} cat="Instrument Sans Caps">
          <span style={{ fontFamily: "'Instrument Sans'", fontSize: 38, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase' }}>nf stay</span>
        </Card>
        <Card n={38} cat="Bricolage Caps Heavy">
          <span style={{ fontFamily: "'Bricolage Grotesque'", fontSize: 42, fontWeight: 800, letterSpacing: -1.5, textTransform: 'uppercase' }}>nfstay</span>
        </Card>

        {/* --- SECTION: Geometric marks --- */}
        <div className="section-label">Geometric marks + text</div>

        <Card n={39} cat="Triangle roof + Inter">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <svg width="38" height="34" viewBox="0 0 38 34" fill="none">
              <path d="M19 2L36 32H2L19 2Z" stroke="#111" strokeWidth="2.5" strokeLinejoin="round" />
            </svg>
            <span style={{ fontFamily: "'Inter'", fontSize: 36, fontWeight: 600, letterSpacing: -0.5 }}>nf stay</span>
          </div>
        </Card>
        <Card n={40} cat="Hexagon + Sora">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <svg width="36" height="40" viewBox="0 0 36 40" fill="none">
              <path d="M18 2L33 11V29L18 38L3 29V11L18 2Z" stroke="#111" strokeWidth="2" strokeLinejoin="round" />
              <text x="18" y="24" textAnchor="middle" fill="#111" fontSize="13" fontWeight="700" fontFamily="Sora">nf</text>
            </svg>
            <span style={{ fontFamily: "'Sora'", fontSize: 32, fontWeight: 500, letterSpacing: 1 }}>stay</span>
          </div>
        </Card>
        <Card n={41} cat="Circle window + Outfit">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="18" stroke="#111" strokeWidth="2" />
              <line x1="20" y1="2" x2="20" y2="38" stroke="#111" strokeWidth="1.5" />
              <line x1="2" y1="20" x2="38" y2="20" stroke="#111" strokeWidth="1.5" />
            </svg>
            <span style={{ fontFamily: "'Outfit'", fontSize: 34, fontWeight: 700, letterSpacing: -1 }}>nfstay</span>
          </div>
        </Card>
        <Card n={42} cat="Diamond + Manrope">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="16" y="1" width="21" height="21" rx="3" transform="rotate(45 16 1)" stroke="#111" strokeWidth="2" />
            </svg>
            <span style={{ fontFamily: "'Manrope'", fontSize: 34, fontWeight: 600, letterSpacing: 0 }}>nf stay</span>
          </div>
        </Card>

        {/* --- SECTION: Negative space / cutout --- */}
        <div className="section-label">Negative space — cut from solid</div>

        <Card n={43} cat="Black pill + white text">
          <div style={{ background: '#111', borderRadius: 50, padding: '14px 36px', display: 'inline-flex', alignItems: 'center' }}>
            <span style={{ fontFamily: "'Inter'", fontSize: 30, fontWeight: 700, color: '#fff', letterSpacing: -0.5 }}>nf stay</span>
          </div>
        </Card>
        <Card n={44} cat="Black rectangle + knockout">
          <div style={{ background: '#111', borderRadius: 8, padding: '16px 32px', display: 'inline-flex', alignItems: 'center' }}>
            <span style={{ fontFamily: "'Outfit'", fontSize: 32, fontWeight: 800, color: '#fff', letterSpacing: -1 }}>nfstay</span>
          </div>
        </Card>
        <Card n={45} cat="Circle knockout">
          <div style={{ width: 100, height: 100, borderRadius: '50%', background: '#111', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: "'Inter'", fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: -1, lineHeight: 1 }}>nf</span>
            <span style={{ fontFamily: "'Inter'", fontSize: 12, fontWeight: 400, color: '#fff', letterSpacing: 4, marginTop: 2 }}>stay</span>
          </div>
        </Card>

        {/* --- SECTION: Condensed / Extended --- */}
        <div className="section-label">Condensed & extended type</div>

        <Card n={46} cat="Ultra condensed Inter">
          <span style={{ fontFamily: "'Inter'", fontSize: 52, fontWeight: 900, letterSpacing: -4, transform: 'scaleX(0.75)', display: 'inline-block' }}>nfstay</span>
        </Card>
        <Card n={47} cat="Extended Sora">
          <span style={{ fontFamily: "'Sora'", fontSize: 28, fontWeight: 600, letterSpacing: 14 }}>nfstay</span>
        </Card>
        <Card n={48} cat="Stretched DM Sans">
          <span style={{ fontFamily: "'DM Sans'", fontSize: 42, fontWeight: 700, letterSpacing: -1, transform: 'scaleX(1.2)', display: 'inline-block' }}>nf stay</span>
        </Card>

        {/* --- SECTION: Underline & accent mark --- */}
        <div className="section-label">Underline & accent marks</div>

        <Card n={49} cat="Inter + underline accent">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span style={{ fontFamily: "'Inter'", fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>nf stay</span>
            <div style={{ width: 24, height: 3, background: '#111', borderRadius: 2, marginTop: 4 }} />
          </div>
        </Card>
        <Card n={50} cat="Outfit + full underline">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontFamily: "'Outfit'", fontSize: 38, fontWeight: 600, letterSpacing: 2 }}>nfstay</span>
            <div style={{ width: '100%', height: 2, background: '#111', marginTop: 6 }} />
          </div>
        </Card>
        <Card n={51} cat="Manrope + dot accent">
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, fontFamily: "'Manrope'", fontSize: 40 }}>
            <span style={{ fontWeight: 700 }}>nf</span>
            <span style={{ fontWeight: 300, marginLeft: 8 }}>stay</span>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#111', marginLeft: 4, alignSelf: 'flex-end', marginBottom: 6 }} />
          </div>
        </Card>

        {/* --- SECTION: Travel / hospitality symbols --- */}
        <div className="section-label">Travel & hospitality symbols</div>

        <Card n={52} cat="Location pin + Space Grotesk">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="28" height="36" viewBox="0 0 28 36" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2C7.4 2 2 7.4 2 14c0 9 12 20 12 20s12-11 12-20c0-6.6-5.4-12-12-12z" />
              <circle cx="14" cy="14" r="4" />
            </svg>
            <span style={{ fontFamily: "'Space Grotesk'", fontSize: 34, fontWeight: 600, letterSpacing: -0.5 }}>nf stay</span>
          </div>
        </Card>
        <Card n={53} cat="Bed icon + Inter">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg width="36" height="28" viewBox="0 0 36 28" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 22V6" /><path d="M2 12h32" /><path d="M34 12v10" /><path d="M2 22h32" />
              <rect x="6" y="6" width="8" height="6" rx="2" />
            </svg>
            <span style={{ fontFamily: "'Inter'", fontSize: 34, fontWeight: 700, letterSpacing: -1 }}>nf stay</span>
          </div>
        </Card>
        <Card n={54} cat="Compass + Bricolage">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg width="34" height="34" viewBox="0 0 34 34" fill="none" stroke="#111" strokeWidth="1.5">
              <circle cx="17" cy="17" r="15" />
              <polygon points="17,6 20,15 17,13 14,15" fill="#111" stroke="none" />
              <polygon points="17,28 14,19 17,21 20,19" fill="none" />
              <line x1="17" y1="2" x2="17" y2="5" /><line x1="17" y1="29" x2="17" y2="32" />
              <line x1="2" y1="17" x2="5" y2="17" /><line x1="29" y1="17" x2="32" y2="17" />
            </svg>
            <span style={{ fontFamily: "'Bricolage Grotesque'", fontSize: 32, fontWeight: 600, letterSpacing: 0 }}>nf stay</span>
          </div>
        </Card>

        {/* --- SECTION: Continuous line art --- */}
        <div className="section-label">Line art — single stroke marks</div>

        <Card n={55} cat="Continuous house line + Inter">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg width="40" height="36" viewBox="0 0 40 36" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 20L20 4L38 20V34H24V22H16V34H2V20Z" />
            </svg>
            <span style={{ fontFamily: "'Inter'", fontSize: 32, fontWeight: 600, letterSpacing: -0.5 }}>nf stay</span>
          </div>
        </Card>
        <Card n={56} cat="Abstract roof line + Sora">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <svg width="80" height="20" viewBox="0 0 80 20" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 18L40 4L75 18" />
            </svg>
            <span style={{ fontFamily: "'Sora'", fontSize: 32, fontWeight: 600, letterSpacing: 2, marginTop: 6 }}>nf stay</span>
          </div>
        </Card>
        <Card n={57} cat="Arch doorway + Outfit">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg width="30" height="40" viewBox="0 0 30 40" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 40V8C2 4 6 2 15 2C24 2 28 4 28 8V40" />
              <path d="M10 40V24C10 20 12 18 15 18C18 18 20 20 20 24V40" />
            </svg>
            <span style={{ fontFamily: "'Outfit'", fontSize: 34, fontWeight: 700, letterSpacing: -1 }}>nf stay</span>
          </div>
        </Card>

        {/* --- SECTION: Ligature / connected --- */}
        <div className="section-label">Ligatures & connected letterforms</div>

        <Card n={58} cat="Overlap nf + Manrope">
          <span style={{ fontFamily: "'Manrope'", fontSize: 44, fontWeight: 800, letterSpacing: -6 }}>
            <span style={{ opacity: 1 }}>n</span><span style={{ opacity: 0.6 }}>f</span>
          </span>
          <span style={{ fontFamily: "'Manrope'", fontSize: 44, fontWeight: 300, letterSpacing: 1, marginLeft: 8 }}>stay</span>
        </Card>
        <Card n={59} cat="Joined baseline + Inter">
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <span style={{ fontFamily: "'Inter'", fontSize: 46, fontWeight: 900, letterSpacing: -3 }}>nf</span>
            <span style={{ fontFamily: "'Inter'", fontSize: 46, fontWeight: 200, letterSpacing: -1, borderBottom: '2.5px solid #111', paddingBottom: 2 }}>stay</span>
          </div>
        </Card>

        {/* --- SECTION: Luxury badge / emblem --- */}
        <div className="section-label">Badge & emblem — luxury feel</div>

        <Card n={60} cat="Rounded pill badge">
          <div style={{ border: '2px solid #111', borderRadius: 50, padding: '10px 32px', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: "'Inter'", fontSize: 13, fontWeight: 600, letterSpacing: 4, textTransform: 'uppercase' }}>nf stay</span>
          </div>
        </Card>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* REFINEMENTS (#61–#65) — #29 × #27 explorations        */}
        {/* ═══════════════════════════════════════════════════════ */}

        <div className="section-label" style={{ borderTop: '3px solid #111', paddingTop: 32 }}>Refinements — #29 × #27 explorations</div>

        {/* #61: #29 layout but Sora font from #27 — box on "nf" */}
        <Card n={61} cat="Sora · box on nf">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 52, height: 52, border: '2.5px solid #111', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Sora'", fontWeight: 700, fontSize: 22 }}>nf</div>
            <span style={{ fontFamily: "'Sora'", fontSize: 34, fontWeight: 400, letterSpacing: 3 }}>stay</span>
          </div>
        </Card>

        {/* #62: Flipped — box on "stay", "nf" standalone, Sora */}
        <Card n={62} cat="Sora · box on stay">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontFamily: "'Sora'", fontSize: 34, fontWeight: 400, letterSpacing: 3 }}>nf</span>
            <div style={{ border: '2.5px solid #111', borderRadius: 10, padding: '10px 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Sora'", fontWeight: 700, fontSize: 22 }}>stay</div>
          </div>
        </Card>

        {/* #63: Box on "stay", thin border, wider spacing, Sora light */}
        <Card n={63} cat="Sora light · thin box on stay">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontFamily: "'Sora'", fontSize: 36, fontWeight: 300, letterSpacing: 4 }}>nf</span>
            <div style={{ border: '1.5px solid #111', borderRadius: 8, padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Sora'", fontWeight: 600, fontSize: 24, letterSpacing: 2 }}>stay</div>
          </div>
        </Card>

        {/* #64: Filled black box on "stay", "nf" standalone, Sora */}
        <Card n={64} cat="Sora · filled box on stay">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontFamily: "'Sora'", fontSize: 34, fontWeight: 400, letterSpacing: 3 }}>nf</span>
            <div style={{ background: '#111', borderRadius: 10, padding: '10px 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Sora'", fontWeight: 700, fontSize: 22, color: '#fff' }}>stay</div>
          </div>
        </Card>

        {/* #65: Pill/rounded box on "stay", "nf" standalone, Sora */}
        <Card n={65} cat="Sora · pill on stay">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontFamily: "'Sora'", fontSize: 34, fontWeight: 400, letterSpacing: 3 }}>nf</span>
            <div style={{ border: '2.5px solid #111', borderRadius: 50, padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Sora'", fontWeight: 600, fontSize: 22, letterSpacing: 1 }}>stay</div>
          </div>
        </Card>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* AIRBNB-STYLE (#66–#69) — rounded, warm, friendly       */}
        {/* ═══════════════════════════════════════════════════════ */}

        <div className="section-label" style={{ borderTop: '3px solid #111', paddingTop: 32 }}>Airbnb style — rounded, warm, friendly</div>

        {/* #66: Nunito Sans — box on nf, clean wordmark, no italic */}
        <Card n={66} cat="Nunito Sans · rounded box + clean">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, border: '2px solid #111', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Nunito Sans'", fontWeight: 800, fontSize: 16 }}>nf</div>
            <span style={{ fontFamily: "'Nunito Sans'", fontSize: 32, fontWeight: 700, letterSpacing: -0.5 }}>stay</span>
          </div>
        </Card>

        {/* #67: Plus Jakarta Sans — no box, just clean wordmark like Airbnb */}
        <Card n={67} cat="Plus Jakarta Sans · pure wordmark">
          <span style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 38, fontWeight: 700, letterSpacing: -0.5 }}>nfstay</span>
        </Card>

        {/* #68: Poppins — box on nf, italic stay */}
        <Card n={68} cat="Poppins · box nf + italic stay">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, border: '2px solid #111', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Poppins'", fontWeight: 700, fontSize: 16 }}>nf</div>
            <span style={{ fontFamily: "'Poppins'", fontSize: 30, fontWeight: 600, fontStyle: 'italic', letterSpacing: -0.3 }}>stay</span>
          </div>
        </Card>

        {/* #69: Plus Jakarta Sans — bold nf, regular stay, one word like "airbnb" */}
        <Card n={69} cat="Plus Jakarta · weight split like Airbnb">
          <span style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 38, letterSpacing: -0.5 }}>
            <span style={{ fontWeight: 800 }}>nf</span><span style={{ fontWeight: 500 }}>stay</span>
          </span>
        </Card>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* PUSHING IT (#70–#74) — bolder, more creative            */}
        {/* ═══════════════════════════════════════════════════════ */}

        <div className="section-label" style={{ borderTop: '3px solid #111', paddingTop: 32 }}>Pushing it — bolder ideas</div>

        {/* #70: "stay" is the hero word, "nf" is a tiny prefix above — luxury hotel style */}
        <Card n={70} cat="Luxury hotel · tiny nf above stay">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1 }}>
            <span style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 11, fontWeight: 700, letterSpacing: 5, textTransform: 'uppercase', marginBottom: 2, marginLeft: 2 }}>nf</span>
            <span style={{ fontFamily: "'Playfair Display'", fontSize: 48, fontWeight: 400, fontStyle: 'italic', letterSpacing: -1 }}>stay</span>
          </div>
        </Card>

        {/* #71: Filled circle mark with "nf" + elegant serif "stay" — like a hotel stamp */}
        <Card n={71} cat="Stamp mark + serif stay">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans'", fontWeight: 800, fontSize: 16, color: '#fff', letterSpacing: -0.5 }}>nf</div>
            <span style={{ fontFamily: "'Cormorant Garamond'", fontSize: 38, fontWeight: 600, fontStyle: 'italic', letterSpacing: 1 }}>stay</span>
          </div>
        </Card>

        {/* #72: One word, serif+sans mix — "nf" geometric, "stay" elegant serif */}
        <Card n={72} cat="Sans + serif blend">
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <span style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 40, fontWeight: 800, letterSpacing: -1 }}>nf</span>
            <span style={{ fontFamily: "'Playfair Display'", fontSize: 40, fontWeight: 400, fontStyle: 'italic', letterSpacing: 0, marginLeft: 2 }}>stay</span>
          </div>
        </Card>

        {/* #73: Minimal — tiny "nf" dot, big "stay" — like a boutique brand */}
        <Card n={73} cat="Boutique · dot nf + big stay">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, border: '2px solid #111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans'", fontWeight: 800, fontSize: 12, letterSpacing: -0.5 }}>nf</div>
            <span style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 42, fontWeight: 700, letterSpacing: -1.5 }}>stay</span>
          </div>
        </Card>

        {/* #74: Full wordmark — mixed weight, playful like Airbnb but with personality */}
        <Card n={74} cat="Airbnb energy · one word, alive">
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <span style={{ fontFamily: "'Nunito Sans'", fontSize: 42, fontWeight: 800, letterSpacing: -1 }}>nf</span>
            <span style={{ fontFamily: "'Nunito Sans'", fontSize: 42, fontWeight: 400, letterSpacing: -1 }}>s</span>
            <span style={{ fontFamily: "'Nunito Sans'", fontSize: 42, fontWeight: 400, fontStyle: 'italic', letterSpacing: -1 }}>tay</span>
          </div>
        </Card>

      </div>

      {/* Footer */}
      <div style={{ maxWidth: 800, margin: '64px auto 40px', textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: '#999' }}>Pick your favourite number(s) and we'll refine from there.</p>
      </div>
    </div>
  );
}

/** Reusable card wrapper */
function Card({ n, cat, children }: { n: number; cat: string; children: React.ReactNode }) {
  return (
    <div className="logo-card">
      <span className="num">#{n}</span>
      <span className="cat">{cat}</span>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111', userSelect: 'none' }}>
        {children}
      </div>
    </div>
  );
}
