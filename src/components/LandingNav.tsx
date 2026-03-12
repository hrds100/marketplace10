import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setMobileOpen(false), [location]);

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 h-[68px] flex items-center transition-all duration-200 ${scrolled ? 'bg-card/95 backdrop-blur-md border-b border-border shadow-sm' : 'bg-transparent'}`}>
        <div className="max-w-[1280px] w-full mx-auto px-6 md:px-10 flex items-center justify-between">
          <Link to="/" className={`text-xl font-extrabold tracking-tight ${scrolled ? 'text-foreground' : 'text-white'}`}>NFsTay</Link>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#deals-strip" className={`text-sm font-medium transition-colors ${scrolled ? 'text-muted-foreground hover:text-foreground' : 'text-white/70 hover:text-white'}`}>Deals</a>
            <a href="#how-it-works" className={`text-sm font-medium transition-colors ${scrolled ? 'text-muted-foreground hover:text-foreground' : 'text-white/70 hover:text-white'}`}>How it Works</a>
            <a href="#pricing" className={`text-sm font-medium transition-colors ${scrolled ? 'text-muted-foreground hover:text-foreground' : 'text-white/70 hover:text-white'}`}>Pricing</a>
            <a href="#university" className={`text-sm font-medium transition-colors ${scrolled ? 'text-muted-foreground hover:text-foreground' : 'text-white/70 hover:text-white'}`}>University</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/signin" className={`text-sm font-medium transition-colors px-3 py-2 ${scrolled ? 'text-muted-foreground hover:text-foreground' : 'text-white/70 hover:text-white'}`}>Sign In</Link>
            <Link to="/signup" className="bg-primary text-primary-foreground text-sm font-semibold h-10 px-5 rounded-lg inline-flex items-center hover:opacity-90 transition-opacity">
              Get Started →
            </Link>
          </div>

          <button className="md:hidden p-2" onClick={() => setMobileOpen(true)}>
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
            <button className="absolute top-5 right-5 p-2" onClick={() => setMobileOpen(false)}>
              <X className="w-6 h-6" />
            </button>
            {['Deals', 'How it Works', 'Pricing', 'University'].map(t => (
              <a key={t} href={`#${t.toLowerCase().replace(/ /g, '-')}`} onClick={() => setMobileOpen(false)} className="text-[22px] font-medium text-foreground">{t}</a>
            ))}
            <Link to="/signup" className="bg-primary text-primary-foreground text-base font-semibold h-12 px-8 rounded-lg inline-flex items-center" onClick={() => setMobileOpen(false)}>
              Get Started →
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
