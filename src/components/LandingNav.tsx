import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

// When served from nfstay.com, auth pages must go to hub.nfstay.com
const hubUrl = (path: string) =>
  typeof window !== 'undefined' && !window.location.hostname.includes('hub.')
    ? `https://hub.nfstay.com${path}`
    : path;
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setMobileOpen(false), [location]);

  return (
    <>
      <nav data-feature="NAV_LAYOUT" className={`fixed top-0 left-0 right-0 z-50 h-[68px] flex items-center transition-all duration-200 ${scrolled ? 'bg-card/95 backdrop-blur-md border-b border-border shadow-sm' : 'bg-transparent'}`}>
        <div className="max-w-[1280px] w-full mx-auto px-6 md:px-10 flex items-center justify-between">
          <a data-feature="NAV_LAYOUT__LANDING_LOGO" href="/" className={`text-xl font-extrabold tracking-tight ${scrolled ? 'text-foreground' : 'text-white'}`}>nfstay</a>
          
          <div className="hidden md:flex items-center gap-8">
            <a data-feature="NAV_LAYOUT__LANDING_LINK" href="#deals-strip" className={`text-sm font-medium transition-colors ${scrolled ? 'text-muted-foreground hover:text-foreground' : 'text-white/70 hover:text-white'}`}>{t('nav.deals')}</a>
            <a data-feature="NAV_LAYOUT__LANDING_LINK" href="#how-it-works" className={`text-sm font-medium transition-colors ${scrolled ? 'text-muted-foreground hover:text-foreground' : 'text-white/70 hover:text-white'}`}>{t('nav.howItWorks')}</a>
            <a data-feature="NAV_LAYOUT__LANDING_LINK" href="#pricing" className={`text-sm font-medium transition-colors ${scrolled ? 'text-muted-foreground hover:text-foreground' : 'text-white/70 hover:text-white'}`}>{t('nav.pricing')}</a>
            <a data-feature="NAV_LAYOUT__LANDING_LINK" href="#university" className={`text-sm font-medium transition-colors ${scrolled ? 'text-muted-foreground hover:text-foreground' : 'text-white/70 hover:text-white'}`}>{t('nav.university')}</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <a data-feature="NAV_LAYOUT__LANDING_CTA" href={hubUrl('/signin')} className={`text-sm font-medium transition-colors px-3 py-2 ${scrolled ? 'text-muted-foreground hover:text-foreground' : 'text-white/70 hover:text-white'}`}>{t('nav.signIn')}</a>
            <a data-feature="NAV_LAYOUT__LANDING_CTA" href={hubUrl('/signup')} className="bg-primary text-primary-foreground text-sm font-semibold h-10 px-5 rounded-lg inline-flex items-center transition-all duration-200 hover:opacity-90 active:scale-[0.97] active:duration-[120ms] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[3px]">
              {t('nav.getStarted')}
            </a>
          </div>

          <button data-feature="NAV_LAYOUT__LANDING_BURGER" className="md:hidden p-2 min-w-[44px] min-h-[44px] flex items-center justify-center" onClick={() => setMobileOpen(true)}>
            <Menu className={`w-6 h-6 ${scrolled ? 'text-foreground' : 'text-white'}`} />
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ y: '-100%' }}
            animate={{ y: 0 }}
            exit={{ y: '-100%' }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="fixed inset-0 z-[200] bg-card flex flex-col items-center justify-center gap-8"
          >
            <button className="absolute top-5 right-5 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center" onClick={() => setMobileOpen(false)}>
              <X className="w-6 h-6" />
            </button>
            {[
              { key: 'nav.deals', href: '#deals' },
              { key: 'nav.howItWorks', href: '#how-it-works' },
              { key: 'nav.pricing', href: '#pricing' },
              { key: 'nav.university', href: '#university' },
            ].map(item => (
              <a key={item.key} href={item.href} onClick={() => setMobileOpen(false)} className="text-[22px] font-medium text-foreground">{t(item.key)}</a>
            ))}
            <a href={hubUrl('/signup')} className="bg-primary text-primary-foreground text-base font-semibold h-12 px-8 rounded-lg inline-flex items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[3px]" onClick={() => setMobileOpen(false)}>
              {t('nav.getStarted')}
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
