import { NavLink, useLocation } from 'react-router-dom';
import { Store, Wallet, Receipt, Vote } from 'lucide-react';

const tabs = [
  { to: '/dashboard/invest/marketplace', icon: Store, label: 'Marketplace' },
  { to: '/dashboard/invest/portfolio', icon: Wallet, label: 'Portfolio' },
  { to: '/dashboard/invest/payouts', icon: Receipt, label: 'Payouts' },
  { to: '/dashboard/invest/proposals', icon: Vote, label: 'Proposals' },
];

export default function InvestSubNav() {
  const location = useLocation();

  return (
    <div className="border-b border-border/30 bg-white/60 backdrop-blur-sm flex-shrink-0">
      <nav className="flex items-center gap-1 px-6 md:px-8 py-1.5">
        {tabs.map(tab => {
          const isActive = location.pathname === tab.to;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] transition-all duration-200 whitespace-nowrap ${
                isActive
                  ? 'bg-accent-light text-primary font-semibold'
                  : 'text-muted-foreground font-medium hover:text-foreground hover:bg-black/[0.04]'
              }`}
            >
              <tab.icon className="w-[13px] h-[13px]" strokeWidth={1.8} />
              <span>{tab.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
