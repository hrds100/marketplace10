import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AuthSlidePanel from '@/components/AuthSlidePanel';
import { NfsLogo } from '@/components/nfstay/NfsLogo';

const REMEMBER_KEY = 'nfstay_remember_email';

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

function derivedPassword(uuid: string): string {
  return uuid.slice(0, 10) + '_NFsTay2!' + uuid.slice(-6);
}

export default function SignIn() {
  const { signIn } = useAuth();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<SocialProvider | null>(null);
  const [error, setError] = useState('');

  const handleSocialSignIn = async (provider: SocialProvider) => {
    setSocialLoading(provider);
    setError('');
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
      localStorage.setItem(
        'particle_intent',
        JSON.stringify({ type: 'signin', provider, redirectTo: redirectTo || '' }),
      );
      await thirdpartyAuth({
        authType: provider as any,
        redirectUrl: window.location.origin + '/auth/particle',
      });
    } catch (err: any) {
      localStorage.removeItem('particle_intent');
      console.error('[SignIn] Social login error:', err);
      setError(`Social login failed: ${err?.message || 'Unknown error'}`);
      setSocialLoading(null);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        window.location.href = redirectTo
          ? decodeURIComponent(redirectTo)
          : '/dashboard/deals';
      }
    });
  }, [redirectTo]);

  useEffect(() => { document.title = 'nfstay - Sign In'; }, []);

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) setEmail(saved);
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError('');
    try {
      const { error: authError } = await signIn(email.trim().toLowerCase(), password);
      if (authError) {
        setError(authError.message);
        return;
      }
      if (rememberMe) {
        localStorage.setItem(REMEMBER_KEY, email.trim().toLowerCase());
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
      window.location.href = redirectTo ? decodeURIComponent(redirectTo) : '/dashboard/deals';
    } catch {
      setError('Sign in failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-feature="AUTH" className="min-h-screen w-full flex items-center justify-center" style={{ backgroundColor: '#f3f3ee' }}>
      <div className="flex w-full h-screen overflow-hidden p-2 gap-2" style={{ backgroundColor: '#f3f3ee' }}>

        {/* Left panel */}
        <div
          className="flex flex-col items-center flex-1 lg:w-1/2 w-full h-full overflow-y-auto bg-white rounded-3xl border"
          style={{ borderColor: '#e8e5df', padding: 'clamp(24px, 3.5vh, 48px)' }}
        >
          <div className="flex items-center justify-center w-full mb-4">
            <NfsLogo />
          </div>

          <div className="flex flex-col items-center justify-center w-full max-w-[480px] flex-1">
            {/* Heading */}
            <div className="text-center w-full" style={{ marginBottom: 'clamp(16px, 2.5vh, 32px)' }}>
              <h2 className="font-semibold text-[#0a0a0a] leading-tight tracking-tight" style={{ fontSize: 'clamp(20px, 2.7vh, 30px)' }}>Welcome back</h2>
              <p className="text-base text-[#737373] text-center mt-1.5 leading-relaxed">Sign in to your nfstay account</p>
            </div>

            {/* Tab switcher */}
            <div data-feature="AUTH__TAB_BAR" className="grid grid-cols-2 w-full border rounded-xl" style={{ height: 40, gap: 2, backgroundColor: '#f3f3ee', borderColor: '#e8e5df', padding: 2, marginBottom: 'clamp(11px, 2vh, 29px)' }}>
              <button className="flex items-center justify-center border-none rounded-[10px] text-sm font-medium cursor-pointer h-full bg-white text-[#1b1b1b]" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)' }}>Sign In</button>
              <Link to="/signup" className="flex items-center justify-center border-none rounded-[10px] text-sm font-medium cursor-pointer h-full bg-transparent text-[#73757c] hover:bg-white/50">Register</Link>
            </div>

            <div className="w-full flex flex-col" style={{ gap: 'clamp(9px, 1.8vh, 22px)' }}>
              {/* Social 2×2 on top */}
              <div className="flex gap-2">
                {PROVIDERS.slice(0, 2).map(({ id, label, icon }) => (
                  <button key={id} data-feature="AUTH__SIGNIN_SOCIAL" onClick={() => handleSocialSignIn(id)} disabled={loading || socialLoading !== null}
                    className="flex-1 flex items-center justify-center gap-2 bg-transparent text-[#0a0a0a] border border-[#e5e5e5] rounded-full text-[15px] font-medium cursor-pointer transition-all duration-150 hover:bg-[#f5f5f5] hover:border-[#c8c8c8] disabled:opacity-50 relative"
                    style={{ height: 45, padding: '8px 12px' }}>
                    {icon} {label}
                    {socialLoading === id && <Loader2 className="w-4 h-4 animate-spin absolute right-3" />}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                {PROVIDERS.slice(2).map(({ id, label, icon }) => (
                  <button key={id} data-feature="AUTH__SIGNIN_SOCIAL" onClick={() => handleSocialSignIn(id)} disabled={loading || socialLoading !== null}
                    className="flex-1 flex items-center justify-center gap-2 bg-transparent text-[#0a0a0a] border border-[#e5e5e5] rounded-full text-[15px] font-medium cursor-pointer transition-all duration-150 hover:bg-[#f5f5f5] hover:border-[#c8c8c8] disabled:opacity-50 relative"
                    style={{ height: 45, padding: '8px 12px' }}>
                    {icon} {label}
                    {socialLoading === id && <Loader2 className="w-4 h-4 animate-spin absolute right-3" />}
                  </button>
                ))}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 w-full">
                <div className="h-px flex-1 bg-[#e5e5e5]" />
                <span className="text-base text-[#737373] whitespace-nowrap">or sign in with email</span>
                <div className="h-px flex-1 bg-[#e5e5e5]" />
              </div>

              {/* Email + Password form */}
              <form className="flex flex-col gap-4" onSubmit={handleSignIn}>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-[#525252] tracking-wide">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#737373] pointer-events-none" />
                    <input data-feature="AUTH__SIGNIN_EMAIL" type="email" placeholder="Enter your email" value={email} onChange={e => setEmail(e.target.value)} required
                      className="w-full h-[41px] bg-white text-[#0a0a0a] border border-[#e5e5e5] rounded-[10px] text-sm outline-none transition-all duration-150 shadow-[0_4px_8px_-1px_rgba(0,0,0,0.05)] focus:border-[#1e9a80] focus:shadow-[0_0_0_3px_rgba(30,154,128,0.15)]"
                      style={{ padding: '4px 12px 4px 40px' }} />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-[#525252] tracking-wide">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#737373] pointer-events-none" />
                    <input data-feature="AUTH__SIGNIN_PASSWORD" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} required
                      className="w-full h-[41px] bg-white text-[#0a0a0a] border border-[#e5e5e5] rounded-[10px] text-sm outline-none transition-all duration-150 shadow-[0_4px_8px_-1px_rgba(0,0,0,0.05)] focus:border-[#1e9a80] focus:shadow-[0_0_0_3px_rgba(30,154,128,0.15)]"
                      style={{ padding: '4px 40px 4px 40px' }} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer p-0.5 text-[#737373] hover:text-[#0a0a0a] flex items-center">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Remember + Forgot */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} id="remember"
                      className="appearance-none w-5 h-5 border border-[#e5e5e5] rounded cursor-pointer transition-all duration-150 checked:bg-[#1e9a80] checked:border-[#1e9a80] bg-white"
                      style={{
                        backgroundImage: rememberMe ? "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'%3E%3C/polyline%3E%3C/svg%3E\")" : 'none',
                        backgroundRepeat: 'no-repeat', backgroundPosition: 'center', backgroundSize: '12px',
                      }} />
                    <label htmlFor="remember" className="text-sm text-[#1b1b1b] cursor-pointer select-none">Remember me</label>
                  </div>
                  <Link data-feature="AUTH__SIGNIN_FORGOT" to="/forgot-password" className="bg-transparent border-none text-[#1e9a80] text-sm font-medium cursor-pointer p-0 hover:underline">Forgot Password?</Link>
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <button data-feature="AUTH__SIGNIN_SUBMIT" type="submit" disabled={loading || !email.trim() || !password.trim()}
                  className="w-full rounded-lg font-medium text-white cursor-pointer transition-all duration-150 hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ height: 37, backgroundColor: '#1e9a80', fontSize: 16, padding: '8px 16px', border: 'none', boxShadow: '0 4px 8px -1px rgba(0,0,0,0.05)' }}>
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Sign In
                </button>
              </form>

              <p className="text-sm text-[#737373] text-center mt-2">
                Don't have an account?{' '}
                <Link data-feature="AUTH__SIGNIN_SIGNUP_LINK" to="/signup" className="text-[#1e9a80] font-semibold">Sign up</Link>
              </p>

              <p data-feature="AUTH__TERMS_NOTICE" className="text-[11px] text-muted-foreground text-center mt-4">
                By signing up, you confirm that you accept our{' '}
                <a href="/terms" className="text-primary underline">Terms and Conditions</a>{' '}
                and{' '}
                <a href="/privacy" className="text-primary underline">Privacy Policy</a>.
              </p>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <AuthSlidePanel />
      </div>
    </div>
  );
}
