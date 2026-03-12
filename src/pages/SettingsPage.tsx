import { useState } from 'react';
import { User, Shield, CreditCard, Bell, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';

const settingsTabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'membership', label: 'Membership', icon: CreditCard },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'signout', label: 'Sign out', icon: LogOut },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [notifications, setNotifications] = useState({
    deals: true, status: true, affiliates: false, whatsapp: true,
  });

  return (
    <div>
      <div className="text-[13px] text-muted-foreground mb-4">
        Settings &gt; <span className="text-foreground capitalize">{activeTab}</span>
      </div>

      <div className="grid lg:grid-cols-[220px_1fr] gap-6">
        {/* Tab list */}
        <div className="bg-card border border-border rounded-2xl p-4">
          {settingsTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full h-9 rounded-lg text-sm font-medium flex items-center gap-2.5 px-3 transition-colors mb-0.5 ${activeTab === tab.id ? 'bg-accent-light text-primary' : 'text-foreground hover:bg-secondary'}`}
            >
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-card border border-border rounded-2xl p-6">
          {activeTab === 'profile' && (
            <div>
              <h2 className="text-[22px] font-bold text-foreground mb-6">Profile</h2>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">JW</div>
                <button className="text-sm text-primary font-semibold hover:opacity-75">Change photo</button>
              </div>
              <div className="space-y-4 max-w-[400px]">
                {[{ l: 'Full name', v: 'James Walker' }, { l: 'Email', v: 'james@nfstay.com' }, { l: 'Username', v: 'jamesw' }].map(f => (
                  <div key={f.l}>
                    <label className="text-xs font-semibold text-foreground block mb-1.5">{f.l}</label>
                    <input defaultValue={f.v} className="input-nfstay w-full" />
                  </div>
                ))}
                <button className="h-11 px-6 rounded-lg bg-nfstay-black text-nfstay-black-foreground font-semibold text-sm hover:opacity-90 transition-opacity">Save changes</button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div>
              <h2 className="text-[22px] font-bold text-foreground mb-6">Security and privacy</h2>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2.5 mb-6">
                <Shield className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span className="text-sm text-blue-800">Your security is our priority.</span>
              </div>
              <div className="space-y-4 max-w-[400px]">
                {['Current password', 'New password', 'Confirm password'].map(f => (
                  <div key={f}>
                    <label className="text-xs font-semibold text-foreground block mb-1.5">{f}</label>
                    <input type="password" placeholder="••••••••" className="input-nfstay w-full" />
                  </div>
                ))}
                <div className="flex items-center justify-between py-3 border-t border-border">
                  <div>
                    <span className="text-sm font-medium text-foreground">Use an authenticator app</span>
                    <span className="badge-green text-[10px] ml-2">Recommended</span>
                  </div>
                  <span className="text-muted-foreground">›</span>
                </div>
                <button className="h-11 px-6 rounded-lg bg-nfstay-black text-nfstay-black-foreground font-semibold text-sm hover:opacity-90 transition-opacity">Update password</button>
              </div>
            </div>
          )}

          {activeTab === 'membership' && (
            <div>
              <h2 className="text-[22px] font-bold text-foreground mb-6">Membership</h2>
              <div className="bg-card border border-border rounded-xl p-5 max-w-[400px]">
                <div className="text-xs text-muted-foreground mb-1">Current plan</div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-foreground">Monthly · £97/month</span>
                  <span className="badge-green">Active</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Next billing date: 28 Apr 2026</p>
                <div className="flex gap-2 mt-4">
                  <button className="h-10 px-4 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors">Manage billing</button>
                  <button className="text-sm text-destructive font-medium hover:opacity-75">Cancel membership</button>
                </div>
                <p className="text-xs text-muted-foreground mt-3">Cancelling takes effect at the end of your billing period.</p>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div>
              <h2 className="text-[22px] font-bold text-foreground mb-6">Notifications</h2>
              <div className="space-y-4 max-w-[500px]">
                {[
                  { key: 'deals' as const, label: 'New deal alerts', desc: 'Get notified when new deals match your criteria' },
                  { key: 'status' as const, label: 'Deal status changes', desc: 'Updates when deals you follow change status' },
                  { key: 'affiliates' as const, label: 'Affiliate conversions', desc: 'Know when your referrals convert' },
                  { key: 'whatsapp' as const, label: 'WhatsApp inquiry notifications', desc: 'Receive inquiry updates via WhatsApp' },
                ].map(n => (
                  <div key={n.key} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <div>
                      <div className="text-sm font-medium text-foreground">{n.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{n.desc}</div>
                    </div>
                    <button
                      onClick={() => setNotifications(prev => ({ ...prev, [n.key]: !prev[n.key] }))}
                      className={`w-11 h-6 rounded-full relative transition-colors ${notifications[n.key] ? 'bg-primary' : 'bg-border'}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${notifications[n.key] ? 'left-[22px]' : 'left-0.5'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'signout' && (
            <div className="text-center py-12">
              <h2 className="text-lg font-medium text-foreground mb-6">Are you sure you want to sign out?</h2>
              <div className="flex gap-3 justify-center">
                <Link to="/" className="h-11 px-6 rounded-lg bg-nfstay-black text-nfstay-black-foreground font-semibold text-sm inline-flex items-center hover:opacity-90 transition-opacity">Sign out</Link>
                <button onClick={() => setActiveTab('profile')} className="h-11 px-6 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors">Cancel</button>
              </div>
              <Link to="/admin" className="text-xs text-muted-foreground mt-6 inline-block hover:text-foreground">Switch to admin view →</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
