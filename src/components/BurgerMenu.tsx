import { useState, useEffect, useRef } from 'react';
import { Menu, User, Shield, CreditCard, Bell, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const menuItems = [
  { icon: User, label: 'Profile', tab: 'profile' },
  { icon: Shield, label: 'Security', tab: 'security' },
  { icon: CreditCard, label: 'Membership', tab: 'membership' },
  { icon: Bell, label: 'Notifications', tab: 'notifications' },
];

export default function BurgerMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
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
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center text-muted-foreground hover:text-foreground transition-colors p-2 rounded-full hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
        title="Menu"
      >
        <Menu className="w-[17px] h-[17px]" strokeWidth={1.8} />
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-[200px] bg-white border border-border/50 rounded-xl shadow-xl z-[200] overflow-hidden py-1">
          {menuItems.map(item => (
            <button
              key={item.tab}
              onClick={() => handleNav(item.tab)}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-foreground hover:bg-gray-50 transition-colors text-left"
            >
              <item.icon className="w-4 h-4 text-muted-foreground" strokeWidth={1.8} />
              {item.label}
            </button>
          ))}
          <div className="border-t border-border/30 my-1" />
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-red-600 hover:bg-red-50 transition-colors text-left"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.8} />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
