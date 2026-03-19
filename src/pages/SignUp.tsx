import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { sendOtp } from '@/lib/n8n';
import { supabase } from '@/integrations/supabase/client';
import { signupSchema, type SignupFormData, passwordStrength, strengthLabels, strengthColors } from '@/lib/validation';
import CountryCodeSelect from '@/components/CountryCodeSelect';
import { toast } from 'sonner';

export default function SignUp() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Capture referral code from URL (?ref=CODE) and store in localStorage
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      localStorage.setItem('nfstay_ref', ref.toUpperCase());
      // Track click via Edge Function (non-blocking)
      supabase.functions.invoke('track-referral', {
        body: null,
        headers: {},
      }).catch(() => {});
      // Use query param approach instead
      fetch(`${import.meta.env.VITE_SUPABASE_URL || 'https://asazddtvjvmckouxcmmo.supabase.co'}/functions/v1/track-referral?code=${encodeURIComponent(ref)}`, {
        method: 'POST',
      }).catch(() => {});
    }
  }, [searchParams]);
  const [showConfirm, setShowConfirm] = useState(false);

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
  const countryCode = watch('countryCode');

  const onSubmit = async (data: SignupFormData) => {
    setLoading(true);
    try {
      const fullPhone = data.countryCode + data.phone.replace(/[^0-9]/g, '');

      const cleanEmail = data.email.trim().toLowerCase();
      const cleanName = data.name.trim();

      // 1. Create Supabase account
      const { data: authData, error: authError } = await signUp(cleanEmail, data.password, cleanName, fullPhone);
      if (authError) {
        toast.error(authError.message);
        setLoading(false);
        return;
      }
      // Supabase returns a fake user with no identities if email already exists
      if (authData?.user && (!authData.user.identities || authData.user.identities.length === 0)) {
        toast.error('An account with this email already exists. Please sign in.');
        setLoading(false);
        return;
      }

      // 1b. Ensure we have a session — signUp may or may not return one
      let userId = authData?.user?.id;
      if (!authData?.session?.access_token) {
        // No session from signUp — sign in to get one
        await new Promise(r => setTimeout(r, 500)); // Brief delay for user to propagate
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: data.password,
        });
        if (signInErr) {
          console.error('Post-signup signIn error:', signInErr.message);
          // Don't block — proceed without session, OTP page will still work
        } else {
          userId = signInData?.user?.id || userId;
        }
      }

      // 1c. Ensure profile has name + whatsapp (trigger creates it, this is backup)
      if (userId) {
        await (supabase
          .from('profiles') as any)
          .update({
            name: cleanName,
            whatsapp: fullPhone,
            whatsapp_verified: false,
          } as any)
          .eq('id', userId);
      }

      // 1d. Link referral if signup came from agent link
      const refCode = localStorage.getItem('nfstay_ref');
      if (refCode && userId) {
        // Save referred_by to profile
        (supabase.from('profiles') as any)
          .update({ referred_by: refCode } as any)
          .eq('id', userId)
          .then(() => {})
          .catch(() => {});

        // Log signup event for the affiliate (via service role in Edge Function)
        fetch(`${import.meta.env.VITE_SUPABASE_URL || 'https://asazddtvjvmckouxcmmo.supabase.co'}/functions/v1/track-referral?code=${encodeURIComponent(refCode)}&event=signup&userId=${userId}&userName=${encodeURIComponent(cleanName)}&userEmail=${encodeURIComponent(cleanEmail)}`, {
          method: 'POST',
        }).catch(() => {});

        localStorage.removeItem('nfstay_ref');
      }

      // 2. Send welcome email + notify admin (non-blocking)
      supabase.functions.invoke('send-email', {
        body: { type: 'welcome-member', data: { email: cleanEmail, name: cleanName } },
      }).catch(() => {});
      supabase.functions.invoke('send-email', {
        body: { type: 'new-signup-admin', data: { email: cleanEmail, name: cleanName, phone: fullPhone } },
      }).catch(() => {});

      // In-app notification for admin (non-blocking)
      (supabase.from('notifications') as any).insert({
        type: 'new_signup',
        title: 'New user signed up',
        body: `${cleanName} (${cleanEmail}) just created an account.`,
      }).then(() => {}).catch(() => {});

      // 3. Send WhatsApp OTP via GHL
      try {
        await sendOtp(fullPhone);
        toast.success('Account created! Check WhatsApp for your code.');
      } catch {
        toast.success('Account created! Sending verification code...');
      }

      // 4. Redirect to OTP page
      navigate(`/verify-otp?phone=${encodeURIComponent(fullPhone)}&name=${encodeURIComponent(data.name)}&email=${encodeURIComponent(data.email)}`);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Form side */}
      <div className="flex items-center justify-center px-6 md:px-8 lg:px-12 py-10">
        <div className="w-full max-w-[440px] mx-auto">
          <Link to="/" className="text-xl font-extrabold text-foreground tracking-tight">
            NFsTay
          </Link>

          <h1 className="text-[28px] font-bold text-foreground mt-8">Create your account</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Start finding rent-to-rent deals today.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
            {/* Full name */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">
                Full name <span className="text-red-500">*</span>
              </label>
              <input
                {...register('name')}
                type="text"
                placeholder="James Walker"
                className="input-nfstay w-full"
              />
              {errors.name && (
                <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                {...register('email')}
                type="email"
                placeholder="james@example.com"
                className="input-nfstay w-full"
              />
              {errors.email && (
                <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
              )}
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
                      <div
                        key={i}
                        className="h-1 flex-1 rounded-full transition-all duration-300"
                        style={{
                          backgroundColor: i <= strength ? strengthColors[strength] : '#E5E7EB',
                        }}
                      />
                    ))}
                  </div>
                  <p
                    className="text-[11px] font-medium mt-1 transition-colors"
                    style={{ color: strengthColors[strength] }}
                  >
                    {strengthLabels[strength]}
                  </p>
                </div>
              )}
              {errors.password && (
                <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>
              )}
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
              {errors.confirmPassword && (
                <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* WhatsApp number */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">
                WhatsApp number <span className="text-red-500">*</span>
              </label>
              <div className="flex">
                <CountryCodeSelect
                  value={countryCode}
                  onChange={(val) => setValue('countryCode', val)}
                />
                <input
                  {...register('phone')}
                  type="tel"
                  placeholder="7863 992 555"
                  className="input-nfstay flex-1 rounded-l-none"
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                We'll send a verification code via WhatsApp
              </p>
              {errors.phone && (
                <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>
              )}
            </div>

            {/* Terms */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                {...register('terms')}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-[#00D084]"
              />
              <span className="text-xs text-muted-foreground leading-relaxed">
                I agree to the{' '}
                <Link to="/terms" className="text-primary font-semibold underline" target="_blank">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-primary font-semibold underline" target="_blank">
                  Privacy Policy
                </Link>{' '}
                <span className="text-red-500">*</span>
              </span>
            </label>
            {errors.terms && (
              <p className="text-xs text-red-500 -mt-2">{errors.terms.message}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-lg font-semibold text-white hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: '#00D084' }}
            >
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.span
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating account...
                  </motion.span>
                ) : (
                  <motion.span
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Create account
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </form>

          <p className="text-sm text-muted-foreground mt-6 text-center">
            Already have an account?{' '}
            <Link to="/signin" className="text-primary font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div
        className="hidden lg:flex relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, hsl(152 76% 36%) 0%, hsl(215 50% 11%) 100%)' }}
      >
        <div className="absolute inset-0 backdrop-blur-3xl" />
        <div className="relative w-full h-full flex flex-col py-8 lg:py-12">
          {/* Top spacer */}
          <div className="flex-1 min-h-[40px]" />

          {/* Center content block */}
          <div className="text-center px-8 lg:px-12 xl:px-16 max-w-[520px] mx-auto">
            {/* Avatars + trust group */}
            <div className="flex flex-col items-center mb-6 lg:mb-8">
              <div className="flex -space-x-3 mb-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <img
                    key={i}
                    src={`https://picsum.photos/seed/auth-av${i}/48/48`}
                    className="w-12 h-12 lg:w-14 lg:h-14 rounded-full border-2 border-white/20"
                    alt=""
                  />
                ))}
              </div>
              <p className="text-sm lg:text-base font-medium text-white/80">
                4,200+ UK operators trust NFsTay
              </p>
            </div>

            {/* Headline — larger and prominent */}
            <h2 className="text-[44px] sm:text-[52px] lg:text-[56px] xl:text-6xl font-bold text-white leading-[1.05] mb-6">
              Your Airbnb portfolio<br />starts here
            </h2>

            {/* Subheadline */}
            <p className="text-base lg:text-lg text-white/70 leading-relaxed max-w-[420px] mx-auto">
              Join thousands of operators using NFsTay to find and close deals faster, with a verified community behind them.
            </p>
          </div>

          {/* Bottom spacer */}
          <div className="flex-1 min-h-[40px]" />

          {/* Bottom trust badge */}
          <div className="flex items-center justify-center gap-2 pb-4 lg:pb-6">
            <CheckCircle2 className="w-5 h-5 text-white/70 shrink-0" />
            <p className="text-sm font-medium text-white/60">
              Fully authorised properties, ready for Airbnb income
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
