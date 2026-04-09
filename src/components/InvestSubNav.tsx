import { NavLink, useLocation } from 'react-router-dom';
import { Store, Wallet, Receipt, Vote, CreditCard } from 'lucide-react';
import { useEmbeddedWallet } from '@particle-network/connectkit';

const tabs = [
  { to: '/dashboard/invest/marketplace', icon: Store, label: 'Marketplace' },
  { to: '/dashboard/invest/portfolio', icon: Wallet, label: 'Portfolio' },
  { to: '/dashboard/invest/proposals', icon: Vote, label: 'Proposals' },
  { to: '/dashboard/invest/payouts', icon: Receipt, label: 'Payouts' },
];

export default function InvestSubNav() {
  const location = useLocation();
  const embeddedWallet = useEmbeddedWallet();

  return (
    <div data-feature="INVEST" className="border-b border-border/30 bg-white/60 backdrop-blur-sm flex-shrink-0">
      <nav className="flex items-center gap-1 px-4 md:px-8 py-1.5 overflow-x-auto">
        {tabs.map(tab => {
          const isActive = location.pathname === tab.to;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              data-feature={`INVEST__NAV_${tab.label.toUpperCase()}`}
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
        {/* Wallet button — opens Particle embedded wallet (same as legacy top-right button) */}
        <div className="ml-auto">
          <button
            onClick={async () => {
              try {
                if (embeddedWallet?.openWallet) {
                  embeddedWallet.openWallet();
                } else {
                  // Fallback: try restoring Particle session then opening
                  const { particleAuth } = await import('@particle-network/auth-core');
                  const pa = particleAuth as any;
                  if (pa?.ethereum) {
                    // Session exists — try opening wallet via auth-core
                    window.open('https://wallet.particle.network', '_blank');
                  } else {
                    window.location.href = '/dashboard/settings';
                  }
                }
              } catch {
                window.location.href = '/dashboard/settings';
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] transition-all duration-200 whitespace-nowrap text-primary font-semibold bg-primary/10 hover:bg-primary/20"
          >
            <CreditCard className="w-[13px] h-[13px]" strokeWidth={1.8} />
          </button>
        </div>
      </nav>
    </div>
  );
}
