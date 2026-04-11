import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Eye, EyeOff, CheckCircle2, ArrowLeft, Mail, Lock, User, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { sendOtp } from '@/core/auth/otp';
import { supabase } from '@/integrations/supabase/client';
import { signupSchema, type SignupFormData, passwordStrength, strengthLabels, strengthColors } from '@/lib/validation';
import CountryCodeSelect from '@/components/CountryCodeSelect';
import AuthSlidePanel from '@/components/AuthSlidePanel';
import { NfsLogo } from '@/components/nfstay/NfsLogo';
import { toast } from 'sonner';

// ── Social provider definitions ─────────────────────────────────────────────

type SocialProvider = 'google' | 'apple' | 'twitter' | 'facebook';

const PROVIDERS: { id: SocialProvider; label: string; icon: React.ReactNode }[] = [
  {
    id: 'google',
    label: 'Google',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
  },
  {
    id: 'apple',
    label: 'Apple',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0 fill-current" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.43c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 3.96zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
      </svg>
    ),
  },
  {
    id: 'twitter',
    label: 'X',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0 fill-current" xmlns="http://www.w3.org/2000/svg">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
  {
    id: 'facebook',
    label: 'Facebook',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2"/>
      </svg>
    ),
  },
];

interface ParticleUserInfo {
  email: string;
  name: string;
  wallet: string;
  uuid: string;
  authMethod: SocialProvider;
}

type ViewState = 'social' | 'phone' | 'email';

// Derive a deterministic Supabase password from Particle UUID
function derivedPassword(uuid: string): string {
  return uuid.slice(0, 10) + '_NFsTay2!' + uuid.slice(-6);
}

// ── Shared shell for all views ──────────────────────────────────────────────

function AuthShell({ children, showTabs, heading, subtitle }: { children: React.ReactNode; showTabs: boolean; heading: string; subtitle: string }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen w-full flex items-center justify-center" style={{ backgroundColor: '#f3f3ee' }}>
      <div className="flex w-full h-screen overflow-hidden p-2 gap-2" style={{ backgroundColor: '#f3f3ee' }}>
        <div className="flex flex-col items-center flex-1 lg:w-1/2 w-full h-full overflow-y-auto bg-white rounded-3xl border" style={{ borderColor: '#e8e5df', padding: 'clamp(24px, 3.5vh, 48px)' }}>
          <div className="flex items-center justify-center w-full mb-4">
            <NfsLogo />
          </div>

          <div className="flex flex-col items-center justify-center w-full max-w-[480px] flex-1">
            <div className="text-center w-full" style={{ marginBottom: 'clamp(16px, 2.5vh, 32px)' }}>
              <h2 className="font-semibold text-[#0a0a0a] leading-tight tracking-tight" style={{ fontSize: 'clamp(20px, 2.7vh, 30px)' }}>{heading}</h2>
              <p className="text-base text-[#737373] text-center mt-1.5 leading-relaxed">{subtitle}</p>
            </div>

            {showTabs && (
              <div className="grid grid-cols-2 w-full border rounded-xl" style={{ height: 40, gap: 2, backgroundColor: '#f3f3ee', borderColor: '#e8e5df', padding: 2, marginBottom: 'clamp(11px, 2vh, 29px)' }}>
                <Link to="/signin" className="flex items-center justify-center border-none rounded-[10px] text-sm font-medium cursor-pointer h-full bg-transparent text-[#73757c] hover:bg-white/50">{t('auth.signInTitle')}</Link>
                <button className="flex items-center justify-center border-none rounded-[10px] text-sm font-medium cursor-pointer h-full bg-white text-[#1b1b1b]" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)' }}>{t('auth.register')}</button>
              </div>
            )}

            {children}
          </div>
        </div>
        <AuthSlidePanel />
      </div>
    </div>
  );
}

export default function SignUp() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signUp } = useAuth();
  const [view, setView] = useState<ViewState>('social');
  const [socialLoading, setSocialLoading] = useState<SocialProvider | null>(null);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [particleUser, setParticleUser] = useState<ParticleUserInfo | null>(null);
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+44');

  useEffect(() => { document.title = 'nfstay - Sign Up'; }, []);

  // Capture referral code from URL (?ref=CODE)
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      localStorage.setItem('nfstay_ref', ref.toUpperCase());
      fetch(`${import.meta.env.VITE_SUPABASE_URL || 'https://asazddtvjvmckouxcmmo.supabase.co'}/functions/v1/track-referral?code=${encodeURIComponent(ref)}`, {
        method: 'POST',
      }).catch(() => {});
    }
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { countryCode: '+44', terms: false as unknown as true },
  });

  const pw = watch('password') || '';
  const strength = passwordStrength(pw);
  const formCountryCode = watch('countryCode');

  // ── Detect particle_user set by callback page ────────────────────────────

  useEffect(() => {
    const raw = localStorage.getItem('particle_user');
    if (raw) {
      try {
        const pu = JSON.parse(raw) as ParticleUserInfo;
        localStorage.removeItem('particle_user');
        setParticleUser(pu);
        setView('phone');
      } catch { /* ignore */ }
    }
  }, []);

  // ── Social login — redirect approach (no popup, no blocking) ─────────────

  const handleSocialLogin = async (provider: SocialProvider) => {
    setSocialLoading(provider);
    try {
      const { particleAuth, thirdpartyAuth } = await import('@particle-network/auth-core');
      const { bsc } = await import('@particle-network/authkit/chains');
      const { PARTICLE_LEGACY_CONFIG } = await import('@/lib/particle');
      const pa = particleAuth as any;
      try {
        pa.init({
          projectId: PARTICLE_LEGACY_CONFIG.projectId,
          clientKey: PARTICLE_LEGACY_CONFIG.clientKey,
          appId: PARTICLE_LEGACY_CONFIG.appId,
          chains: [bsc],

        });
      } catch { /* already initialized */ }
      localStorage.setItem('particle_intent', JSON.stringify({ type: 'signup', provider }));
      await thirdpartyAuth({
        authType: provider as any,
        redirectUrl: window.location.origin + '/auth/particle',
      });
    } catch (err: any) {
      localStorage.removeItem('particle_intent');
      console.error('[SignUp] Social login error:', err);
      toast.error(`Social login failed: ${err?.message || 'Unknown error'}`);
      setSocialLoading(null);
    }
  };

  // ── WhatsApp collection (after social login) ─────────────────────────────

  const handleSendOtp = async () => {
    if (!particleUser || !phone.trim()) return;
    const fullPhone = countryCode + phone.replace(/[^0-9]/g, '');
    setPhoneLoading(true);
    try {
      await sendOtp(fullPhone);
      toast.success('Code sent via WhatsApp!');
      navigate(
        `/verify-otp?phone=${encodeURIComponent(fullPhone)}&name=${encodeURIComponent(particleUser.name)}&email=${encodeURIComponent(particleUser.email)}&wallet=${encodeURIComponent(particleUser.wallet)}&authMethod=${particleUser.authMethod}`,
      );
    } catch {
      toast.error('Failed to send code. Check your number and try again.');
    } finally {
      setPhoneLoading(false);
    }
  };

  // ── Email / password signup (existing flow) ──────────────────────────────

  const onSubmit = async (data: SignupFormData) => {
    setEmailLoading(true);
    try {
      const fullPhone = data.countryCode + data.phone.replace(/[^0-9]/g, '');
      const cleanEmail = data.email.trim().toLowerCase();
      const cleanName = data.name.trim();

      const { data: authData, error: authError } = await signUp(cleanEmail, data.password, cleanName, fullPhone);
      const isDuplicate = authError?.message?.toLowerCase().includes('already registered')
        || (authData?.user && (!authData.user.identities || authData.user.identities.length === 0));
      if (isDuplicate) {
        toast('This email already has an account', {
          description: 'Redirecting you to sign in...',
          action: { label: 'Sign in now', onClick: () => navigate(`/signin?email=${encodeURIComponent(cleanEmail)}`) },
        });
        setTimeout(() => navigate(`/signin?email=${encodeURIComponent(cleanEmail)}`), 2000);
        return;
      }
      if (authError) { toast.error(authError.message); return; }

      let userId = authData?.user?.id;
      if (!authData?.session?.access_token) {
        await new Promise(r => setTimeout(r, 500));
        const { data: signInData } = await supabase.auth.signInWithPassword({ email: cleanEmail, password: data.password });
        userId = signInData?.user?.id || userId;
      }

      if (userId) {
        const { error: profileErr } = await (supabase.from('profiles') as any)
          .update({ name: cleanName, email: cleanEmail, whatsapp: fullPhone, whatsapp_verified: false } as any)
          .eq('id', userId);
        // If update fails (e.g., no profile row yet from trigger), try upsert as fallback
        if (profileErr) {
          console.error('Profile update failed, trying upsert:', profileErr.message);
          await (supabase.from('profiles') as any)
            .upsert({ id: userId, name: cleanName, email: cleanEmail, whatsapp: fullPhone, whatsapp_verified: false } as any);
        }
      }

      const refCode = localStorage.getItem('nfstay_ref');
      if (refCode && userId) {
        (supabase.from('profiles') as any).update({ referred_by: refCode } as any).eq('id', userId).then(() => {}).catch(() => {});
        fetch(`${import.meta.env.VITE_SUPABASE_URL || 'https://asazddtvjvmckouxcmmo.supabase.co'}/functions/v1/track-referral?code=${encodeURIComponent(refCode)}&event=signup&userId=${userId}&userName=${encodeURIComponent(cleanName)}&userEmail=${encodeURIComponent(cleanEmail)}`, { method: 'POST' }).catch(() => {});
        localStorage.removeItem('nfstay_ref');
      }

      supabase.functions.invoke('send-email', { body: { type: 'welcome-member', data: { email: cleanEmail, name: cleanName } } }).catch(() => {});
      supabase.functions.invoke('send-email', { body: { type: 'new-signup-admin', data: { email: cleanEmail, name: cleanName, phone: fullPhone } } }).catch(() => {});
      (supabase.from('notifications') as any).insert({ type: 'new_signup', title: 'New user signed up', body: `${cleanName} (${cleanEmail}) just created an account.` }).then(() => {}).catch(() => {});

      // A/B test — track signup completion (fire-and-forget)
      try {
        const abVariant = document.cookie.match(/(?:^|; )nfs_ab=([^;]*)/)?.[1];
        const abVisitor = localStorage.getItem('nfs_visitor_id');
        if (abVariant && abVisitor) {
          navigator.sendBeacon?.(
            'https://asazddtvjvmckouxcmmo.supabase.co/functions/v1/ab-track',
            JSON.stringify({ visitor_id: abVisitor, variant: abVariant, event_type: 'signup_complete', page_url: '/signup', metadata: {}, timestamp: new Date().toISOString() })
          );
        }
      } catch {}

      try { await sendOtp(fullPhone); toast.success('Account created! Check WhatsApp for your code.'); }
      catch { toast.success('Account created! Sending verification code...'); }

      navigate(`/verify-otp?phone=${encodeURIComponent(fullPhone)}&name=${encodeURIComponent(cleanName)}&email=${encodeURIComponent(cleanEmail)}`);
    } catch { toast.error('Something went wrong. Please try again.'); }
    finally { setEmailLoading(false); }
  };

  // ── Social button view ───────────────────────────────────────────────────

  if (view === 'social') {
    return (
      <AuthShell showTabs heading={t('auth.createYourAccount')} subtitle={t('auth.joinThousands')}>
        <div className="w-full flex flex-col" style={{ gap: 'clamp(9px, 1.8vh, 22px)' }}>

          {/* Social 2×2 grid */}
          <div className="grid grid-cols-2 gap-2 w-full">
            {PROVIDERS.map(({ id, label, icon }) => (
              <button key={id} data-feature="AUTH__SIGNUP_SOCIAL" onClick={() => handleSocialLogin(id)} disabled={socialLoading !== null}
                className="flex items-center justify-center gap-2 bg-transparent text-[#0a0a0a] border border-[#e5e5e5] rounded-full text-[15px] font-medium cursor-pointer transition-all duration-150 hover:bg-[#f5f5f5] hover:border-[#c8c8c8] disabled:opacity-50 relative"
                style={{ height: 45 }}>
                {icon} {label}
                {socialLoading === id && <Loader2 className="w-4 h-4 animate-spin absolute right-3" />}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 w-full">
            <div className="h-px flex-1 bg-[#e5e5e5]" />
            <span className="text-sm text-[#737373] whitespace-nowrap">{t('auth.or')}</span>
            <div className="h-px flex-1 bg-[#e5e5e5]" />
          </div>

          {/* Email signup button */}
          <button onClick={() => setView('email')}
            className="w-full flex items-center justify-center gap-2 bg-transparent text-[#0a0a0a] border border-[#e5e5e5] rounded-full text-[15px] font-medium cursor-pointer transition-all duration-150 hover:bg-[#f5f5f5] hover:border-[#c8c8c8]"
            style={{ height: 45 }}>
            <Mail className="w-5 h-5" /> {t('auth.signUpWithEmail')}
          </button>

          <p className="text-sm text-[#737373] text-center mt-2">
            {t('auth.hasAccount')}{' '}
            <Link to="/signin" className="text-[#1e9a80] font-semibold">{t('auth.signIn')}</Link>
          </p>

          <p data-feature="AUTH__TERMS_NOTICE" className="text-[11px] text-muted-foreground text-center mt-4">
            {t('auth.termsNotice')}{' '}
            <a href="/terms" className="text-primary underline">{t('auth.termsAndConditions')}</a>{' '}
            and{' '}
            <a href="/privacy" className="text-primary underline">{t('auth.privacyPolicy')}</a>.
          </p>
        </div>
      </AuthShell>
    );
  }

  // ── WhatsApp collection view (after social login) ────────────────────────

  if (view === 'phone') {
    return (
      <AuthShell showTabs={false} heading={t('auth.addYourWhatsApp')} subtitle={t('auth.oneLastStep')}>
        <div className="w-full flex flex-col" style={{ gap: 'clamp(9px, 1.8vh, 22px)' }}>
          <button onClick={() => setView('social')} className="flex items-center gap-1.5 text-sm text-[#737373] bg-transparent border-none cursor-pointer p-0 hover:text-[#0a0a0a] mb-2">
            <ArrowLeft className="w-4 h-4" /> {t('auth.back')}
          </button>

          <div className="mb-2">
            <p className="text-sm text-[#737373]">
              {t('auth.signedInAs')} <span className="font-medium text-[#0a0a0a]">{particleUser?.email || 'you'}</span>
            </p>
            <p className="text-[13px] text-[#737373] mt-1">{t('auth.wellSendDealAlerts')}</p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[#525252] tracking-wide">{t('auth.whatsAppNumber')} <span className="text-red-500">*</span></label>
            <div className="flex">
              <CountryCodeSelect value={countryCode} onChange={setCountryCode} />
              <div className="relative flex-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#737373] pointer-events-none" />
                <input type="tel" placeholder="7863 992 555" value={phone} onChange={e => setPhone(e.target.value)}
                  className="w-full h-[41px] bg-white text-[#0a0a0a] border border-[#e5e5e5] rounded-r-[10px] text-sm outline-none transition-all duration-150 shadow-[0_4px_8px_-1px_rgba(0,0,0,0.05)] focus:border-[#1e9a80] focus:shadow-[0_0_0_3px_rgba(30,154,128,0.15)]"
                  style={{ padding: '4px 12px 4px 40px' }} />
              </div>
            </div>
            <p className="text-[11px] text-[#737373] mt-1">{t('auth.wellSendCode')}</p>
          </div>

          <button onClick={handleSendOtp} disabled={phoneLoading || !phone.trim()}
            className="w-full rounded-lg font-medium text-white cursor-pointer transition-all duration-150 hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ height: 37, backgroundColor: '#1e9a80', fontSize: 16, padding: '8px 16px', border: 'none', boxShadow: '0 4px 8px -1px rgba(0,0,0,0.05)' }}>
            {phoneLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {phoneLoading ? t('auth.sendingCode') : t('auth.sendVerificationCode')}
          </button>

          <p className="text-xs text-[#737373] text-center mt-2">
            {t('auth.termsNotice')}{' '}
            <Link to="/terms" className="text-[#1e9a80] font-semibold underline" target="_blank">{t('auth.termsAndConditions')}</Link> and{' '}
            <Link to="/privacy" className="text-[#1e9a80] font-semibold underline" target="_blank">{t('auth.privacyPolicy')}</Link>.
          </p>
        </div>
      </AuthShell>
    );
  }

  // ── Email / password view ────────────────────────────────────────────────

  return (
    <AuthShell data-feature="AUTH" showTabs={false} heading={t('auth.createYourAccount')} subtitle={t('auth.createWithEmail')}>
      <div className="w-full flex flex-col" style={{ gap: 'clamp(9px, 1.8vh, 22px)' }}>
        {/* Back */}
        <div className="flex items-center mb-1">
          <button onClick={() => setView('social')} className="flex items-center gap-1.5 text-sm text-[#737373] bg-transparent border-none cursor-pointer p-0 hover:text-[#0a0a0a]">
            <ArrowLeft className="w-4 h-4" /> {t('auth.back')}
          </button>
        </div>
        {/* Social login buttons - 2×2 grid */}
        <div className="grid grid-cols-2 gap-2 w-full">
          {PROVIDERS.map(({ id, label, icon }) => (
            <button key={id} data-feature="AUTH__SIGNUP_SOCIAL" onClick={() => handleSocialLogin(id)} disabled={socialLoading !== null}
              className="flex items-center justify-center gap-2 bg-transparent text-[#0a0a0a] border border-[#e5e5e5] rounded-full text-[15px] font-medium cursor-pointer transition-all duration-150 hover:bg-[#f5f5f5] hover:border-[#c8c8c8] disabled:opacity-50 relative"
              style={{ height: 45 }}>
              {icon} {label}
              {socialLoading === id && <Loader2 className="w-4 h-4 animate-spin absolute right-3" />}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 w-full">
          <div className="h-px flex-1 bg-[#e5e5e5]" />
          <span className="text-base text-[#737373] whitespace-nowrap">{t('auth.orSignUpWithEmail')}</span>
          <div className="h-px flex-1 bg-[#e5e5e5]" />
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          {/* Name */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[#525252] tracking-wide">{t('auth.fullName')} <span className="text-red-500">*</span></label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#737373] pointer-events-none" />
              <input data-feature="AUTH__SIGNUP_NAME" {...register('name')} type="text" placeholder={t('auth.fullNamePlaceholder')}
                className="w-full h-[41px] bg-white text-[#0a0a0a] border border-[#e5e5e5] rounded-[10px] text-sm outline-none transition-all duration-150 shadow-[0_4px_8px_-1px_rgba(0,0,0,0.05)] focus:border-[#1e9a80] focus:shadow-[0_0_0_3px_rgba(30,154,128,0.15)]"
                style={{ padding: '4px 12px 4px 40px' }} />
            </div>
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[#525252] tracking-wide">{t('auth.email')} <span className="text-red-500">*</span></label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#737373] pointer-events-none" />
              <input data-feature="AUTH__SIGNUP_EMAIL" {...register('email')} type="email" placeholder={t('auth.emailPlaceholder')}
                className="w-full h-[41px] bg-white text-[#0a0a0a] border border-[#e5e5e5] rounded-[10px] text-sm outline-none transition-all duration-150 shadow-[0_4px_8px_-1px_rgba(0,0,0,0.05)] focus:border-[#1e9a80] focus:shadow-[0_0_0_3px_rgba(30,154,128,0.15)]"
                style={{ padding: '4px 12px 4px 40px' }} />
            </div>
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[#525252] tracking-wide">{t('auth.password')} <span className="text-red-500">*</span></label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#737373] pointer-events-none" />
              <input data-feature="AUTH__SIGNUP_PASSWORD" {...register('password')} type={showPassword ? 'text' : 'password'} placeholder={t('auth.minEightChars')}
                className="w-full h-[41px] bg-white text-[#0a0a0a] border border-[#e5e5e5] rounded-[10px] text-sm outline-none transition-all duration-150 shadow-[0_4px_8px_-1px_rgba(0,0,0,0.05)] focus:border-[#1e9a80] focus:shadow-[0_0_0_3px_rgba(30,154,128,0.15)]"
                style={{ padding: '4px 40px 4px 40px' }} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer p-0.5 text-[#737373] hover:text-[#0a0a0a] flex items-center">
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {pw.length > 0 && (
              <div className="mt-2">
                <div className="flex gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300" style={{ backgroundColor: i <= strength ? strengthColors[strength] : '#E5E7EB' }} />
                  ))}
                </div>
                <p className="text-[11px] font-medium mt-1 transition-colors" style={{ color: strengthColors[strength] }}>{strengthLabels[strength]}</p>
              </div>
            )}
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
          </div>

          {/* Confirm password */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[#525252] tracking-wide">{t('auth.confirmPassword')} <span className="text-red-500">*</span></label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#737373] pointer-events-none" />
              <input {...register('confirmPassword')} type={showConfirm ? 'text' : 'password'} placeholder={t('auth.repeatPassword')}
                className="w-full h-[41px] bg-white text-[#0a0a0a] border border-[#e5e5e5] rounded-[10px] text-sm outline-none transition-all duration-150 shadow-[0_4px_8px_-1px_rgba(0,0,0,0.05)] focus:border-[#1e9a80] focus:shadow-[0_0_0_3px_rgba(30,154,128,0.15)]"
                style={{ padding: '4px 40px 4px 40px' }} />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} tabIndex={-1}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer p-0.5 text-[#737373] hover:text-[#0a0a0a] flex items-center">
                {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>}
          </div>

          {/* WhatsApp */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[#525252] tracking-wide">{t('auth.whatsAppNumber')} <span className="text-red-500">*</span></label>
            <div className="flex">
              <CountryCodeSelect value={formCountryCode} onChange={(val) => setValue('countryCode', val)} />
              <div className="relative flex-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#737373] pointer-events-none" />
                <input data-feature="AUTH__SIGNUP_PHONE" {...register('phone')} type="tel" placeholder="7863 992 555"
                  className="w-full h-[41px] bg-white text-[#0a0a0a] border border-[#e5e5e5] rounded-r-[10px] text-sm outline-none transition-all duration-150 shadow-[0_4px_8px_-1px_rgba(0,0,0,0.05)] focus:border-[#1e9a80] focus:shadow-[0_0_0_3px_rgba(30,154,128,0.15)]"
                  style={{ padding: '4px 12px 4px 40px' }} />
              </div>
            </div>
            <p className="text-[11px] text-[#737373] mt-1">{t('auth.wellSendVerificationWhatsApp')}</p>
            {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>}
          </div>

          {/* Terms */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" {...register('terms')}
              className="mt-0.5 appearance-none w-5 h-5 border border-[#e5e5e5] rounded cursor-pointer transition-all duration-150 checked:bg-[#1e9a80] checked:border-[#1e9a80] bg-white shrink-0" />
            <span className="text-xs text-[#737373] leading-relaxed">
              {t('auth.iAgreeToThe')}{' '}
              <Link to="/terms" className="text-[#1e9a80] font-semibold underline" target="_blank">{t('auth.termsOfService')}</Link>
              {' '}and{' '}
              <Link to="/privacy" className="text-[#1e9a80] font-semibold underline" target="_blank">{t('auth.privacyPolicy')}</Link>
              {' '}<span className="text-red-500">*</span>
            </span>
          </label>
          {errors.terms && <p className="text-xs text-red-500 -mt-2">{errors.terms.message}</p>}

          {/* Submit */}
          <button data-feature="AUTH__SIGNUP_SUBMIT" type="submit" disabled={emailLoading}
            className="w-full rounded-lg font-medium text-white cursor-pointer transition-all duration-150 hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ height: 37, backgroundColor: '#1e9a80', fontSize: 16, padding: '8px 16px', border: 'none', boxShadow: '0 4px 8px -1px rgba(0,0,0,0.05)' }}>
            <AnimatePresence mode="wait">
              {emailLoading ? (
                <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />{t('auth.creatingAccount')}
                </motion.span>
              ) : (
                <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />{t('auth.createAccount')}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </form>

        <p className="text-sm text-[#737373] text-center mt-2">
          {t('auth.hasAccount')}{' '}
          <Link to="/signin" className="text-[#1e9a80] font-semibold">{t('auth.signIn')}</Link>
        </p>

        <p data-feature="AUTH__TERMS_NOTICE" className="text-[11px] text-muted-foreground text-center mt-4">
          {t('auth.termsNotice')}{' '}
          <a href="/terms" className="text-primary underline">{t('auth.termsAndConditions')}</a>{' '}
          and{' '}
          <a href="/privacy" className="text-primary underline">{t('auth.privacyPolicy')}</a>.
        </p>
      </div>
    </AuthShell>
  );
}
