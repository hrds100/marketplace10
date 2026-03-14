import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const { signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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

      // 1. Create Supabase account
      const { data: authData, error: authError } = await signUp(data.email, data.password, data.name, fullPhone);
      if (authError) {
        toast.error(authError.message);
        setLoading(false);
        return;
      }

      // 1b. Ensure profile exists with name + whatsapp (trigger may be broken)
      if (authData?.user) {
        await supabase
          .from('profiles')
          .upsert({
            id: authData.user.id,
            name: data.name,
            whatsapp: fullPhone,
            whatsapp_verified: false,
          } as Record<string, unknown>);
      }

      // 2. Send WhatsApp OTP via GHL
      try {
        await sendOtp(fullPhone);
        toast.success('Account created! Check WhatsApp for your code.');
      } catch {
        toast.success('Account created! Sending verification code...');
      }

      // 3. Redirect to OTP page
      navigate(`/verify-otp?phone=${encodeURIComponent(fullPhone)}&name=${encodeURIComponent(data.name)}&email=${encodeURIComponent(data.email)}`);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Form side */}
      <div className="w-full lg:w-[42%] flex items-center justify-center p-6 md:p-8 lg:p-12">
        <div className="w-full max-w-md mx-auto">
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

      {/* Right hero — Stake 2026 layout */}
      <div className="hidden lg:flex lg:w-[58%] bg-[#FAFBFC] border-l border-gray-100">
        <div className="flex-1 flex flex-col justify-center px-12 xl:px-20 py-16 space-y-8">
          {/* Operator count */}
          <h1 className="text-5xl xl:text-7xl font-black tracking-tight bg-gradient-to-r from-emerald-500 to-green-600 bg-clip-text text-transparent leading-none">
            4,200+
            <span className="block text-3xl xl:text-4xl font-bold text-gray-900 mt-2 bg-none" style={{ WebkitTextFillColor: 'initial' }}>
              UK Operators
            </span>
          </h1>

          {/* Headline */}
          <h2 className="text-2xl xl:text-4xl font-bold text-gray-900 leading-tight">
            Your Airbnb portfolio starts here
          </h2>

          {/* Social proof */}
          <p className="text-lg xl:text-xl text-gray-500 max-w-lg leading-relaxed">
            Join thousands using NFsTay to find deals faster.{' '}
            <span className="font-semibold text-emerald-600">Community verified.</span>
          </p>

          {/* Hub + Logos */}
          <div className="mt-8 pt-8 border-t border-gray-200 space-y-5">
            <p className="text-base font-semibold text-gray-800">
              Hub of agents &amp; landlords for Airbnb operators
            </p>
            <div className="flex items-center gap-8 flex-wrap">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Rightmove_Logo.svg/118px-Rightmove_Logo.svg.png"
                alt="Rightmove"
                className="h-8 opacity-60 hover:opacity-100 transition-opacity"
              />
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Zoopla_logo.svg/200px-Zoopla_logo.svg.png"
                alt="Zoopla"
                className="h-7 opacity-60 hover:opacity-100 transition-opacity"
              />
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Booking.com_logo.svg/200px-Booking.com_logo.svg.png"
                alt="Booking.com"
                className="h-7 opacity-60 hover:opacity-100 transition-opacity"
              />
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Airbnb_Logo_B%C3%A9lo.svg/200px-Airbnb_Logo_B%C3%A9lo.svg.png"
                alt="Airbnb"
                className="h-7 opacity-60 hover:opacity-100 transition-opacity"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
