import { useState, useEffect } from 'react';
import { User, Shield, CreditCard, Bell, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const settingsTabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'membership', label: 'Membership', icon: CreditCard },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'signout', label: 'Sign out', icon: LogOut },
];

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState({ name: '', email: '', whatsapp: '' });
  const [saving, setSaving] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', new_pw: '', confirm: '' });
  const [notifications, setNotifications] = useState({
    deals: true, status: true, affiliates: false, whatsapp: true,
  });

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('name, email, whatsapp').eq('user_id', user.id).single().then(({ data }) => {
      if (data) setProfile({ name: data.name || '', email: data.email || '', whatsapp: data.whatsapp || '' });
    });
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      name: profile.name,
      whatsapp: profile.whatsapp,
    }).eq('user_id', user.id);
    setSaving(false);
    if (error) toast.error('Failed to save');
    else toast.success('Profile updated');
  };

  const handleUpdatePassword = async () => {
    if (passwords.new_pw !== passwords.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwords.new_pw.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: passwords.new_pw });
    if (error) toast.error(error.message);
    else {
      toast.success('Password updated');
      setPasswords({ current: '', new_pw: '', confirm: '' });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const initials = profile.name ? profile.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : 'U';

  return (
    <div>
      <div className="text-[13px] text-muted-foreground mb-4">
        Settings &gt; <span className="text-foreground capitalize">{activeTab}</span>
      </div>

      <div className="grid lg:grid-cols-[220px_1fr] gap-6">
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

        <div className="bg-card border border-border rounded-2xl p-6">
          {activeTab === 'profile' && (
            <div>
              <h2 className="text-[22px] font-bold text-foreground mb-6">Profile</h2>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">{initials}</div>
              </div>
              <div className="space-y-4 max-w-[400px]">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">Full name</label>
                  <input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} className="input-nfstay w-full" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">Email</label>
                  <input value={profile.email} disabled className="input-nfstay w-full opacity-60" />
                  <p className="text-[11px] text-muted-foreground mt-1">Email cannot be changed</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">WhatsApp</label>
                  <input value={profile.whatsapp} onChange={e => setProfile(p => ({ ...p, whatsapp: e.target.value }))} className="input-nfstay w-full" placeholder="+44 7911 123456" />
                </div>
                <button onClick={handleSaveProfile} disabled={saving} className="h-11 px-6 rounded-lg bg-nfstay-black text-nfstay-black-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div>
              <h2 className="text-[22px] font-bold text-foreground mb-6">Security and privacy</h2>
              <div className="rounded-lg p-3 flex items-center gap-2.5 mb-6 bg-accent-light">
                <Shield className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-sm text-accent-foreground">Your security is our priority.</span>
              </div>
              <div className="space-y-4 max-w-[400px]">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">New password</label>
                  <input type="password" value={passwords.new_pw} onChange={e => setPasswords(p => ({ ...p, new_pw: e.target.value }))} placeholder="Min 8 characters" className="input-nfstay w-full" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">Confirm password</label>
                  <input type="password" value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} placeholder="Repeat password" className="input-nfstay w-full" />
                </div>
                <button onClick={handleUpdatePassword} className="h-11 px-6 rounded-lg bg-nfstay-black text-nfstay-black-foreground font-semibold text-sm hover:opacity-90 transition-opacity">Update password</button>
              </div>
            </div>
          )}

          {activeTab === 'membership' && (
            <div>
              <h2 className="text-[22px] font-bold text-foreground mb-6">Membership</h2>
              <div className="bg-card border border-border rounded-xl p-5 max-w-[400px]">
                <div className="text-xs text-muted-foreground mb-1">Current plan</div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-foreground">Monthly · £47/month</span>
                  <span className="badge-green">Active</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Manage your subscription via SamCart.</p>
                <div className="flex gap-2 mt-4">
                  <a href="https://checkout.nfstay.com/manage" target="_blank" rel="noopener noreferrer" className="h-10 px-4 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors inline-flex items-center">Manage billing</a>
                </div>
                <p className="text-xs text-muted-foreground mt-3">Cancelling takes effect at the end of your billing period.</p>
              </div>

              <div className="mt-6 max-w-[400px]">
                <h3 className="text-sm font-bold text-foreground mb-3">Upgrade your plan</h3>
                <div className="space-y-3">
                  <a href="https://checkout.nfstay.com/lifetime" target="_blank" rel="noopener noreferrer" className="block rounded-xl border border-border p-4 hover:border-primary transition-colors">
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-foreground">£997</span>
                      <span className="text-sm text-muted-foreground">lifetime access</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Pay once, access forever</p>
                  </a>
                  <a href="https://checkout.nfstay.com/yearly" target="_blank" rel="noopener noreferrer" className="block rounded-xl border border-border p-4 hover:border-primary transition-colors">
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-foreground">£597</span>
                      <span className="text-sm text-muted-foreground">/ year</span>
                      <span className="ml-2 text-[11px] font-semibold text-primary bg-accent-light px-2 py-0.5 rounded-full">Save 5 months</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Annual billing, cancel any time</p>
                  </a>
                </div>
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
                <button onClick={handleSignOut} className="h-11 px-6 rounded-lg bg-nfstay-black text-nfstay-black-foreground font-semibold text-sm inline-flex items-center hover:opacity-90 transition-opacity">Sign out</button>
                <button onClick={() => setActiveTab('profile')} className="h-11 px-6 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors">Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
