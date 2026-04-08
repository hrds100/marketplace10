import { useState, useEffect, useRef } from 'react';
import { Menu, User, Shield, CreditCard, Bell, Wallet, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';

const menuItemKeys = [
  { icon: User, i18nKey: 'settings.profile', tab: 'profile' },
  { icon: Shield, i18nKey: 'settings.security', tab: 'security' },
  { icon: CreditCard, i18nKey: 'settings.membership', tab: 'membership' },
  { icon: Bell, i18nKey: 'settings.notifications', tab: 'notifications' },
  { icon: Wallet, i18nKey: 'settings.payoutSettings', tab: 'payout' },
];

export default function BurgerMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { signOut } = useAuth();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleNav = (tab: string) => {
    setOpen(false);
    navigate(`/dashboard/settings?tab=${tab}`);
  };

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    navigate('/signin');
  };

  return (
    <div data-feature="NAV_LAYOUT" ref={ref} className="relative">
      <button
        data-feature="NAV_LAYOUT__TOP_PROFILE"
        onClick={() => setOpen(!open)}
        className="flex items-center text-muted-foreground hover:text-foreground transition-colors p-2 rounded-full hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
        title="Menu"
      >
        <Menu className="w-[17px] h-[17px]" strokeWidth={1.8} />
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-[200px] bg-white border border-border/50 rounded-xl shadow-xl z-[200] overflow-hidden py-1">
          {menuItemKeys.map(item => (
            <button
              key={item.tab}
              data-feature={
                item.tab === 'profile' ? 'NAV_LAYOUT__BURGER_PROFILE' :
                item.tab === 'security' ? 'NAV_LAYOUT__BURGER_SECURITY' :
                item.tab === 'membership' ? 'NAV_LAYOUT__BURGER_MEMBERSHIP' :
                item.tab === 'notifications' ? 'NAV_LAYOUT__BURGER_NOTIFICATIONS' :
                undefined
              }
              onClick={() => handleNav(item.tab)}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-foreground hover:bg-gray-50 transition-colors text-left"
            >
              <item.icon className="w-4 h-4 text-muted-foreground" strokeWidth={1.8} />
              {t(item.i18nKey)}
            </button>
          ))}
          <div className="border-t border-border/30 my-1" />
          <button
            data-feature="NAV_LAYOUT__BURGER_LOGOUT"
            onClick={handleSignOut}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-red-600 hover:bg-red-50 transition-colors text-left"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.8} />
            {t('nav.signOut')}
          </button>
        </div>
      )}
    </div>
  );
}
