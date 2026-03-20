import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const REMEMBER_KEY = 'nfstay_remember_email';

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
    label: 'Continue with X',
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

      // Save intent before redirect
      localStorage.setItem(
        'particle_intent',
        JSON.stringify({ type: 'signin', provider, redirectTo: redirectTo || '' }),
      );

      // Redirect to OAuth provider (no popup)
      await thirdpartyAuth({
        authType: provider as any,
        redirectUrl: window.location.origin + '/auth/particle',
      });
      // Page redirects away here
    } catch (err: any) {
      localStorage.removeItem('particle_intent');
      console.error('[SignIn] Social login error:', err);
      setError(`Social login failed: ${err?.message || 'Unknown error'}`);
      setSocialLoading(null);
    }
  };

  // Redirect already-authenticated users away from the sign-in page
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        window.location.href = redirectTo
          ? decodeURIComponent(redirectTo)
          : '/dashboard/deals';
      }
    });
  }, [redirectTo]);

  // Pre-fill email from localStorage
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
      // Persist or clear email
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
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-6 md:p-8">
        <div className="w-full max-w-[400px]">
          <Link to="/" className="text-xl font-extrabold text-foreground tracking-tight">NFsTay</Link>

          <h1 className="text-[28px] font-bold text-foreground mt-8">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to your NFsTay account.</p>

          {/* Social sign in */}
          <div className="mt-8 space-y-3">
            {PROVIDERS.map(({ id, label, icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => handleSocialSignIn(id)}
                disabled={loading || socialLoading !== null}
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
            <span className="text-xs text-muted-foreground">or sign in with email</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form className="space-y-4" onSubmit={handleSignIn}>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Email</label>
              <input
                type="email"
                placeholder="james@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input-nfstay w-full"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-nfstay w-full pr-10"
                  required
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
              <div className="flex items-center justify-between mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="w-4 h-4 rounded border-2 border-gray-300 bg-white checked:bg-gray-100 checked:border-gray-600" />
                  <span className="text-xs text-muted-foreground">Remember me</span>
                </label>
                <Link to="/forgot-password" className="text-xs text-primary font-semibold hover:underline">
                  Forgot password?
                </Link>
              </div>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading || !email.trim() || !password.trim()}
              className="w-full h-12 rounded-lg font-semibold text-white hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: '#00D084' }}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Sign in
            </button>
          </form>

          <p className="text-sm text-muted-foreground mt-6 text-center">
            Don't have an account? <Link to="/signup" className="text-primary font-semibold">Sign up</Link>
          </p>
        </div>
      </div>

      <div
        className="hidden lg:flex flex-1 items-center justify-center p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, hsl(152 76% 36%) 0%, hsl(215 50% 11%) 100%)' }}
      >
        <div className="absolute inset-0 backdrop-blur-3xl" />
        <div className="relative max-w-[400px]">
          <h2 className="text-[28px] font-bold text-white">Find verified rent-to-rent deals across the UK</h2>
          <p className="text-base mt-4 text-white/70">1,800+ landlord-approved listings. CRM tools. Airbnb University. Everything you need to build a portfolio.</p>
          <div className="flex -space-x-2 mt-8">
            {[1,2,3,4,5].map(i => <img key={i} src={`https://picsum.photos/seed/auth-av${i}/48/48`} className="w-10 h-10 rounded-full border-2 border-white/20" alt="" />)}
          </div>
          <p className="text-sm mt-3 text-white/60">4,200+ UK operators trust NFsTay</p>
        </div>
      </div>
    </div>
  );
}
