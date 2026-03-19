import { useState, useEffect, useRef } from 'react';
import { User, Shield, CreditCard, Bell, LogOut, Wallet, Copy, Check, Upload, Camera, Loader2 } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import BankDetailsForm from '@/components/BankDetailsForm';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserTier } from '@/hooks/useUserTier';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { isPaidTier, tierDisplayName, getFunnelUrl, getUpgradeUrl } from '@/lib/ghl';

const settingsTabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'membership', label: 'Membership', icon: CreditCard },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'payouts', label: 'Payout Settings', icon: Wallet },
  { id: 'signout', label: 'Sign out', icon: LogOut },
];

interface NotifPrefs {
  notif_whatsapp_new_deals: boolean;
  notif_whatsapp_daily: boolean;
  notif_email_daily: boolean;
  notif_whatsapp_status: boolean;
}

const defaultNotifs: NotifPrefs = {
  notif_whatsapp_new_deals: true,
  notif_whatsapp_daily: true,
  notif_email_daily: true,
  notif_whatsapp_status: true,
};

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { tier } = useUserTier();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState({ name: '', email: '', whatsapp: '' });
  const [saving, setSaving] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', new_pw: '', confirm: '' });
  const { address: walletAddress, connected: walletConnected, connect: connectWallet, connecting } = useWallet();
  const [copied, setCopied] = useState(false);
  const [notifs, setNotifs] = useState<NotifPrefs>(defaultNotifs);
  // Wallet change permission
  const [walletChangeUntil, setWalletChangeUntil] = useState<string | null>(null);
  const [showWalletReplace, setShowWalletReplace] = useState(false);
  const [newWalletAddress, setNewWalletAddress] = useState('');
  const [savingWallet, setSavingWallet] = useState(false);
  // Avatar upload
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Load profile + notification prefs + wallet permission + avatar
  useEffect(() => {
    if (!user) return;
    (supabase.from('profiles') as any)
      .select('name, whatsapp, notif_whatsapp_new_deals, notif_whatsapp_daily, notif_email_daily, notif_whatsapp_status, wallet_change_allowed_until, avatar_url')
      .eq('id', user.id)
      .single()
      .then(({ data }: { data: Record<string, unknown> | null }) => {
        if (data) {
          setProfile({ name: (data.name as string) || '', email: user.email || '', whatsapp: (data.whatsapp as string) || '' });
          setNotifs({
            notif_whatsapp_new_deals: (data.notif_whatsapp_new_deals as boolean) ?? true,
            notif_whatsapp_daily: (data.notif_whatsapp_daily as boolean) ?? true,
            notif_email_daily: (data.notif_email_daily as boolean) ?? true,
            notif_whatsapp_status: (data.notif_whatsapp_status as boolean) ?? true,
          });
          setWalletChangeUntil((data.wallet_change_allowed_until as string) || null);
          setAvatarUrl((data.avatar_url as string) || null);
        } else {
          setProfile(p => ({ ...p, email: user.email || '' }));
        }
      });
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      name: profile.name,
      whatsapp: profile.whatsapp,
    }).eq('id', user.id);
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

  const handleToggleNotif = async (key: keyof NotifPrefs) => {
    if (!user) return;
    const newVal = !notifs[key];
    setNotifs(prev => ({ ...prev, [key]: newVal }));
    const { error } = await supabase
      .from('profiles')
      .update({ [key]: newVal })
      .eq('id', user.id);
    if (error) {
      // Revert on failure
      setNotifs(prev => ({ ...prev, [key]: !newVal }));
      toast.error('Failed to save preference');
    }
  };

  // Wallet replacement
  const isWalletChangeAllowed = walletChangeUntil ? new Date(walletChangeUntil) > new Date() : false;
  const walletChangeRemaining = walletChangeUntil
    ? (() => {
        const diff = new Date(walletChangeUntil).getTime() - Date.now();
        if (diff <= 0) return '';
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        return hours > 0 ? `${hours}h ${minutes}m remaining` : `${minutes}m remaining`;
      })()
    : '';

  const handleReplaceWallet = async () => {
    if (!user) return;
    const addr = newWalletAddress.trim();
    if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) {
      toast.error('Invalid Ethereum address. Must start with 0x and be 42 characters (hex only).');
      return;
    }
    setSavingWallet(true);
    try {
      const { error } = await (supabase.from('profiles') as any)
        .update({ wallet_address: addr })
        .eq('id', user.id);
      if (error) throw error;
      toast.success('Wallet address updated successfully');
      setShowWalletReplace(false);
      setNewWalletAddress('');
    } catch (err) {
      toast.error('Failed to update wallet address');
    }
    setSavingWallet(false);
  };

  // Avatar upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    setUploadingAvatar(true);
    try {
      const fileName = `${user.id}/${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from('profile-photos')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(data.path);
      // Save to profiles
      const { error: updateError } = await (supabase.from('profiles') as any)
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);
      if (updateError) throw updateError;
      setAvatarUrl(publicUrl);
      toast.success('Profile photo updated');
    } catch (err) {
      toast.error('Failed to upload photo');
    }
    setUploadingAvatar(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const initials = profile.name ? profile.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : 'U';

  const Toggle = ({ on, onToggle, disabled }: { on: boolean; onToggle?: () => void; disabled?: boolean }) => (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`w-11 h-6 rounded-full relative transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${on ? 'bg-primary' : 'bg-border'}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );

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
                <div className="relative group">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-16 h-16 rounded-full object-cover border-2 border-border" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">{initials}</div>
                  )}
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute inset-0 w-16 h-16 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    {uploadingAvatar ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Camera className="w-5 h-5 text-white" />}
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </div>
                <div>
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
                  >
                    {uploadingAvatar ? 'Uploading...' : 'Upload Photo'}
                  </button>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Max 5MB, image files only</p>
                </div>
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
              <h2 className="text-[22px] font-bold text-foreground mb-6">Subscription</h2>

              {/* Current tier card */}
              <div className="bg-card border border-border rounded-xl p-5 max-w-[480px]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Current plan</div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-foreground">{tierDisplayName(tier)}</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isPaidTier(tier) ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
                        {isPaidTier(tier) ? 'Active' : 'Free'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const url = isPaidTier(tier)
                        ? getUpgradeUrl(tier, { email: user?.email })
                        : getFunnelUrl({ email: user?.email });
                      if (url) window.open(url, '_blank');
                    }}
                    className="px-4 py-2 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800 transition-colors"
                  >
                    {isPaidTier(tier) ? 'Manage Plan' : 'Upgrade Now'}
                  </button>
                </div>

                {/* Tier benefits */}
                <div className="border-t border-border pt-4">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">What's included</div>
                  {tier === 'free' && (
                    <ul className="text-sm text-muted-foreground space-y-1.5">
                      <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Browse deals</li>
                    </ul>
                  )}
                  {tier === 'monthly' && (
                    <ul className="text-sm text-foreground space-y-1.5">
                      <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Unlimited inquiries, full chat access</li>
                      <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> CRM pipeline</li>
                      <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> University access</li>
                    </ul>
                  )}
                  {tier === 'yearly' && (
                    <ul className="text-sm text-foreground space-y-1.5">
                      <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Everything in Monthly</li>
                      <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> 2 months free (save £134/yr)</li>
                    </ul>
                  )}
                  {tier === 'lifetime' && (
                    <ul className="text-sm text-foreground space-y-1.5">
                      <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Everything forever</li>
                      <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Priority support</li>
                    </ul>
                  )}
                </div>

                {isPaidTier(tier) && (
                  <p className="text-[11px] text-muted-foreground mt-4">To cancel or update billing, contact support@nfstay.com or manage from your payment confirmation email.</p>
                )}
              </div>

              {/* Upgrade options for free/monthly users */}
              {(!isPaidTier(tier) || tier === 'monthly') && (
                <div className="mt-6 max-w-[480px] space-y-3">
                  <h3 className="text-sm font-bold text-foreground">
                    {isPaidTier(tier) ? 'Upgrade your plan' : 'Get started'}
                  </h3>
                  {!isPaidTier(tier) && (
                    <button onClick={() => { const url = getFunnelUrl({ email: user?.email }); if (url) window.open(url, '_blank'); }}
                      className="block w-full text-left rounded-xl border-2 border-primary p-4 hover:bg-secondary/50 transition-colors">
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold text-foreground">£67</span>
                        <span className="text-sm text-muted-foreground">/ month</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Unlimited inquiries, full chat access · Cancel any time</p>
                    </button>
                  )}
                  <button onClick={() => { const url = getUpgradeUrl('yearly', { email: user?.email }); if (url) window.open(url, '_blank'); }}
                    className="block w-full text-left rounded-xl border border-border p-4 hover:bg-secondary/50 transition-colors">
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-foreground">£397</span>
                      <span className="text-sm text-muted-foreground">/ year</span>
                      <span className="ml-2 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Save £407</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Everything + 2 months free</p>
                  </button>
                  <button onClick={() => { const url = getUpgradeUrl('lifetime', { email: user?.email }); if (url) window.open(url, '_blank'); }}
                    className="block w-full text-left rounded-xl border border-border p-4 hover:bg-secondary/50 transition-colors">
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-foreground">£997</span>
                      <span className="text-sm text-muted-foreground">one-time</span>
                      <span className="ml-2 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Best value</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Everything forever + priority support</p>
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'notifications' && (
            <div>
              <h2 className="text-[22px] font-bold text-foreground mb-2">Notifications</h2>
              <p className="text-sm text-muted-foreground mb-6">Choose how you want to be notified about activity on your account.</p>

              <div className="max-w-[600px]">
                {/* Header row */}
                <div className="flex items-center gap-4 pb-3 border-b border-border mb-1">
                  <div className="flex-1" />
                  <div className="w-20 text-center text-xs font-semibold text-muted-foreground">Email</div>
                  <div className="w-20 text-center text-xs font-semibold text-muted-foreground">WhatsApp</div>
                </div>

                {/* New deal alerts: Email always ON, WhatsApp toggleable */}
                <div className="flex items-center gap-4 py-4 border-b border-border">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">New deal alerts</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Get notified when new deals match your criteria</div>
                  </div>
                  <div className="w-20 flex justify-center">
                    <Toggle on={true} disabled />
                  </div>
                  <div className="w-20 flex justify-center">
                    <Toggle on={notifs.notif_whatsapp_new_deals} onToggle={() => handleToggleNotif('notif_whatsapp_new_deals')} />
                  </div>
                </div>

                {/* Daily digest: both toggleable */}
                <div className="flex items-center gap-4 py-4 border-b border-border">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">Daily digest</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Summary of new deals and activity each day</div>
                  </div>
                  <div className="w-20 flex justify-center">
                    <Toggle on={notifs.notif_email_daily} onToggle={() => handleToggleNotif('notif_email_daily')} />
                  </div>
                  <div className="w-20 flex justify-center">
                    <Toggle on={notifs.notif_whatsapp_daily} onToggle={() => handleToggleNotif('notif_whatsapp_daily')} />
                  </div>
                </div>

                {/* Status changes: Email always ON, WhatsApp toggleable */}
                <div className="flex items-center gap-4 py-4 border-b border-border">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">Status changes</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Updates when deals you follow change status</div>
                  </div>
                  <div className="w-20 flex justify-center">
                    <Toggle on={true} disabled />
                  </div>
                  <div className="w-20 flex justify-center">
                    <Toggle on={notifs.notif_whatsapp_status} onToggle={() => handleToggleNotif('notif_whatsapp_status')} />
                  </div>
                </div>

                {/* Affiliate conversions: both always ON */}
                <div className="flex items-center gap-4 py-4">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">Affiliate conversions</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Know when your referrals convert</div>
                  </div>
                  <div className="w-20 flex justify-center">
                    <Toggle on={true} disabled />
                  </div>
                  <div className="w-20 flex justify-center">
                    <Toggle on={true} disabled />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payouts' && (
            <div>
              <h2 className="text-[22px] font-bold text-foreground mb-6">Payout Settings</h2>

              {/* Payout Address */}
              <div className="max-w-[480px] mb-8">
                <h3 className="text-sm font-bold text-foreground mb-3">Payout Address</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={walletAddress || 'No wallet connected'}
                      readOnly
                      disabled
                      className="flex-1 h-11 rounded-[10px] border border-border bg-muted/50 px-3.5 text-sm font-mono text-muted-foreground"
                    />
                    {walletAddress ? (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(walletAddress);
                          setCopied(true);
                          toast.success('Copied to clipboard');
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors flex-shrink-0"
                      >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    ) : (
                      <button
                        onClick={() => connectWallet().catch(() => toast.error('Wallet connection failed. Please try again.'))}
                        disabled={connecting}
                        className="text-xs font-medium text-primary hover:underline flex-shrink-0 disabled:opacity-50"
                      >
                        {connecting ? 'Setting up...' : 'Connect wallet'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Wallet Replace Section */}
                {isWalletChangeAllowed && (
                  <div className="mt-3 p-3 rounded-lg border border-blue-200 bg-blue-50/50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-blue-700">Wallet change permitted</span>
                      <span className="text-[11px] text-blue-500">{walletChangeRemaining}</span>
                    </div>
                    {!showWalletReplace ? (
                      <button
                        onClick={() => setShowWalletReplace(true)}
                        className="text-xs font-medium text-blue-700 hover:underline"
                      >
                        Replace wallet address
                      </button>
                    ) : (
                      <div className="space-y-2 mt-2">
                        <input
                          type="text"
                          placeholder="0x..."
                          value={newWalletAddress}
                          onChange={e => setNewWalletAddress(e.target.value)}
                          className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setShowWalletReplace(false); setNewWalletAddress(''); }}
                            className="flex-1 h-9 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleReplaceWallet}
                            disabled={savingWallet || !newWalletAddress}
                            className="flex-1 h-9 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                          >
                            {savingWallet ? 'Saving...' : 'Update Wallet'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bank Details */}
              <div className="max-w-[480px] mb-8">
                <h3 className="text-sm font-bold text-foreground mb-3">Bank Details</h3>
                <BankDetailsForm />
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
