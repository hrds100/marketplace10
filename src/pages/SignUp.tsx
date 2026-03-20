import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Eye, EyeOff, CheckCircle2, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { sendOtp } from '@/lib/n8n';
import { supabase } from '@/integrations/supabase/client';
import { signupSchema, type SignupFormData, passwordStrength, strengthLabels, strengthColors } from '@/lib/validation';
import CountryCodeSelect from '@/components/CountryCodeSelect';
import { toast } from 'sonner';

// ── Social provider definitions ─────────────────────────────────────────────

type SocialProvider = 'google' | 'apple' | 'twitter' | 'facebook';

const PROVIDERS: { id: SocialProvider; label: string; icon: React.ReactNode }[] = [
  {
    id: 'google',
    label: 'Continue with Google',
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
    label: 'Continue with Apple',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0 fill-current" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.43c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 3.96zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
      </svg>
    ),
  },
  {
    id: 'twitter',
    label: 'Continue with X (Twitter)',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0 fill-current" xmlns="http://www.w3.org/2000/svg">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
  {
    id: 'facebook',
    label: 'Continue with Facebook',
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

export default function SignUp() {
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
      const { PARTICLE_CONFIG } = await import('@/lib/particle');
      const pa = particleAuth as any;

      try {
        pa.init({
          projectId: PARTICLE_CONFIG.projectId,
          clientKey: PARTICLE_CONFIG.clientKey,
          appId: PARTICLE_CONFIG.appId,
          chains: [bsc],
        });
      } catch { /* already initialized */ }

      // Save intent before redirect — callback page reads this
      localStorage.setItem('particle_intent', JSON.stringify({ type: 'signup', provider }));

      // Redirect to OAuth provider (no popup — redirects current page)
      await thirdpartyAuth({
        authType: provider as any,
        redirectUrl: window.location.origin + '/auth/particle',
      });
      // Page redirects away here — code below never runs
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
      if (authError) {
        toast.error(authError.message);
        return;
      }
      if (authData?.user && (!authData.user.identities || authData.user.identities.length === 0)) {
        toast.error('An account with this email already exists. Please sign in.');
        return;
      }

      let userId = authData?.user?.id;
      if (!authData?.session?.access_token) {
        await new Promise(r => setTimeout(r, 500));
        const { data: signInData } = await supabase.auth.signInWithPassword({ email: cleanEmail, password: data.password });
        userId = signInData?.user?.id || userId;
      }

      if (userId) {
        await (supabase.from('profiles') as any)
          .update({ name: cleanName, whatsapp: fullPhone, whatsapp_verified: false } as any)
          .eq('id', userId);
      }

      // Referral tracking
      const refCode = localStorage.getItem('nfstay_ref');
      if (refCode && userId) {
        (supabase.from('profiles') as any).update({ referred_by: refCode } as any).eq('id', userId).then(() => {}).catch(() => {});
        fetch(`${import.meta.env.VITE_SUPABASE_URL || 'https://asazddtvjvmckouxcmmo.supabase.co'}/functions/v1/track-referral?code=${encodeURIComponent(refCode)}&event=signup&userId=${userId}&userName=${encodeURIComponent(cleanName)}&userEmail=${encodeURIComponent(cleanEmail)}`, { method: 'POST' }).catch(() => {});
        localStorage.removeItem('nfstay_ref');
      }

      // Notifications
      supabase.functions.invoke('send-email', { body: { type: 'welcome-member', data: { email: cleanEmail, name: cleanName } } }).catch(() => {});
      supabase.functions.invoke('send-email', { body: { type: 'new-signup-admin', data: { email: cleanEmail, name: cleanName, phone: fullPhone } } }).catch(() => {});
      (supabase.from('notifications') as any).insert({ type: 'new_signup', title: 'New user signed up', body: `${cleanName} (${cleanEmail}) just created an account.` }).then(() => {}).catch(() => {});

      try {
        await sendOtp(fullPhone);
        toast.success('Account created! Check WhatsApp for your code.');
      } catch {
        toast.success('Account created! Sending verification code...');
      }

      navigate(`/verify-otp?phone=${encodeURIComponent(fullPhone)}&name=${encodeURIComponent(cleanName)}&email=${encodeURIComponent(cleanEmail)}`);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setEmailLoading(false);
    }
  };

  // ── Right panel (shared) ─────────────────────────────────────────────────

  const RightPanel = () => (
    <div
      className="hidden lg:flex relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, hsl(152 76% 36%) 0%, hsl(215 50% 11%) 100%)' }}
    >
      <div className="absolute inset-0 backdrop-blur-3xl" />
      <div className="relative w-full h-full flex flex-col py-8 lg:py-12">
        <div className="flex-1 min-h-[40px]" />
        <div className="text-center px-8 lg:px-12 xl:px-16 max-w-[520px] mx-auto">
          <div className="flex flex-col items-center mb-6 lg:mb-8">
            <div className="flex -space-x-3 mb-2">
              {[
                'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&fit=crop&crop=face',
                'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&fit=crop&crop=face',
                'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=96&h=96&fit=crop&crop=face',
                'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&fit=crop&crop=face',
                'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&fit=crop&crop=face',
              ].map((src, i) => (
                <img key={i} src={src} className="w-12 h-12 lg:w-14 lg:h-14 rounded-full border-2 border-white/20 object-cover" alt="" />
              ))}
            </div>
            <p className="text-sm lg:text-base font-medium text-white/80">4,200+ UK operators trust NFsTay</p>
          </div>
          <h2 className="text-[44px] sm:text-[52px] lg:text-[56px] xl:text-6xl font-bold text-white leading-[1.05] mb-6">
            Your Airbnb portfolio<br />starts here
          </h2>
          <p className="text-base lg:text-lg text-white/70 leading-relaxed max-w-[420px] mx-auto">
            Join thousands of operators using NFsTay to find and close deals faster.
          </p>
        </div>
        <div className="flex-1 min-h-[40px]" />
        <div className="flex items-center justify-center gap-2 pb-4 lg:pb-6">
          <CheckCircle2 className="w-5 h-5 text-white/70 shrink-0" />
          <p className="text-sm font-medium text-white/60">Fully authorised properties, ready for Airbnb income</p>
        </div>
      </div>
    </div>
  );

  // ── Social button view ───────────────────────────────────────────────────

  if (view === 'social') {
    return (
      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
        <div className="flex items-center justify-center px-6 md:px-8 lg:px-12 py-10">
          <div className="w-full max-w-[400px] mx-auto">
            <Link to="/" className="text-xl font-extrabold text-foreground tracking-tight">NFsTay</Link>

            <h1 className="text-[28px] font-bold text-foreground mt-8">Create your account</h1>
            <p className="text-sm text-muted-foreground mt-1">Sign up with your social account to get started.</p>

            <div className="mt-8 space-y-3">
              {PROVIDERS.map(({ id, label, icon }) => (
                <button
                  key={id}
                  onClick={() => handleSocialLogin(id)}
                  disabled={socialLoading !== null}
                  className="w-full h-12 rounded-lg border border-border bg-card hover:bg-secondary/60 transition-all flex items-center gap-3 px-4 font-medium text-sm text-foreground disabled:opacity-50 relative"
                >
                  {icon}
                  <span className="flex-1 text-center">{label}</span>
                  {socialLoading === id && <Loader2 className="w-4 h-4 animate-spin absolute right-4" />}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <button
              onClick={() => setView('email')}
              className="w-full h-12 rounded-lg border border-border bg-card hover:bg-secondary/60 transition-all flex items-center justify-center gap-2 font-medium text-sm text-foreground"
            >
              Continue with email
            </button>

            <p className="text-sm text-muted-foreground mt-6 text-center">
              Already have an account?{' '}
              <Link to="/signin" className="text-primary font-semibold">Sign in</Link>
            </p>
          </div>
        </div>
        <RightPanel />
      </div>
    );
  }

  // ── WhatsApp collection view (after social login) ────────────────────────

  if (view === 'phone') {
    return (
      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
        <div className="flex items-center justify-center px-6 md:px-8 lg:px-12 py-10">
          <div className="w-full max-w-[400px] mx-auto">
            <Link to="/" className="text-xl font-extrabold text-foreground tracking-tight">NFsTay</Link>

            <button
              onClick={() => setView('social')}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mt-8 mb-4"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>

            <h1 className="text-[28px] font-bold text-foreground">Add your WhatsApp</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Signed in as <span className="font-medium text-foreground">{particleUser?.email || 'you'}</span>.<br />
              We'll send deal alerts and your verification code here.
            </p>

            <div className="mt-8 space-y-5">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  WhatsApp number <span className="text-red-500">*</span>
                </label>
                <div className="flex">
                  <CountryCodeSelect value={countryCode} onChange={setCountryCode} />
                  <input
                    type="tel"
                    placeholder="7863 992 555"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="input-nfstay flex-1 rounded-l-none"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">We'll send a 4-digit verification code via WhatsApp</p>
              </div>

              <button
                onClick={handleSendOtp}
                disabled={phoneLoading || !phone.trim()}
                className="w-full h-12 rounded-lg font-semibold text-white hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: '#00D084' }}
              >
                {phoneLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {phoneLoading ? 'Sending code...' : 'Send verification code'}
              </button>
            </div>

            <p className="text-xs text-muted-foreground mt-6 text-center">
              By continuing you agree to our{' '}
              <Link to="/terms" className="text-primary font-semibold underline" target="_blank">Terms</Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-primary font-semibold underline" target="_blank">Privacy Policy</Link>.
            </p>
          </div>
        </div>
        <RightPanel />
      </div>
    );
  }

  // ── Email / password view ────────────────────────────────────────────────

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 md:px-8 lg:px-12 py-10">
        <div className="w-full max-w-[440px] mx-auto">
          <Link to="/" className="text-xl font-extrabold text-foreground tracking-tight">NFsTay</Link>

          <button
            onClick={() => setView('social')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mt-8 mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>

          <h1 className="text-[28px] font-bold text-foreground">Create your account</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign up with your email address.</p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
            {/* Full name */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">
                Full name <span className="text-red-500">*</span>
              </label>
              <input {...register('name')} type="text" placeholder="James Walker" className="input-nfstay w-full" />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">
                Email <span className="text-red-500">*</span>
              </label>
              <input {...register('email')} type="email" placeholder="james@example.com" className="input-nfstay w-full" />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 8 characters"
                  className="input-nfstay w-full pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">
                Confirm password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  {...register('confirmPassword')}
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  className="input-nfstay w-full pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>}
            </div>

            {/* WhatsApp number */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">
                WhatsApp number <span className="text-red-500">*</span>
              </label>
              <div className="flex">
                <CountryCodeSelect value={formCountryCode} onChange={(val) => setValue('countryCode', val)} />
                <input {...register('phone')} type="tel" placeholder="7863 992 555" className="input-nfstay flex-1 rounded-l-none" />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">We'll send a verification code via WhatsApp</p>
              {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>}
            </div>

            {/* Terms */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" {...register('terms')} className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-[#00D084]" />
              <span className="text-xs text-muted-foreground leading-relaxed">
                I agree to the{' '}
                <Link to="/terms" className="text-primary font-semibold underline" target="_blank">Terms of Service</Link>
                {' '}and{' '}
                <Link to="/privacy" className="text-primary font-semibold underline" target="_blank">Privacy Policy</Link>{' '}
                <span className="text-red-500">*</span>
              </span>
            </label>
            {errors.terms && <p className="text-xs text-red-500 -mt-2">{errors.terms.message}</p>}

            {/* Submit */}
            <button
              type="submit"
              disabled={emailLoading}
              className="w-full h-12 rounded-lg font-semibold text-white hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: '#00D084' }}
            >
              <AnimatePresence mode="wait">
                {emailLoading ? (
                  <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />Creating account...
                  </motion.span>
                ) : (
                  <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />Create account
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </form>

          <p className="text-sm text-muted-foreground mt-6 text-center">
            Already have an account?{' '}
            <Link to="/signin" className="text-primary font-semibold">Sign in</Link>
          </p>
        </div>
      </div>
      <RightPanel />
    </div>
  );
}
