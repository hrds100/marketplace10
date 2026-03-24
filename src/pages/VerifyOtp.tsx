import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { sendOtp, verifyOtp } from '@/lib/n8n';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';


// Derive a deterministic Supabase password from Particle UUID (must match SignUp.tsx)
function derivedPassword(uuid: string): string {
  return uuid.slice(0, 10) + '_NFsTay2!' + uuid.slice(-6);
}

export default function VerifyOtp() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const phone = params.get('phone') || '';
  const name = params.get('name') || '';
  const email = params.get('email') || '';
  const wallet = params.get('wallet') || '';
  const authMethod = params.get('authMethod') || '';

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(300); // 5 min
  const [canResend, setCanResend] = useState(false);
  const verifyingRef = useRef(false);
  const toastFiredRef = useRef(false);

  // Particle wallet creation handled in handleVerify via dynamic import

  // Countdown timer
  useEffect(() => {
    if (timer <= 0) {
      setCanResend(true);
      return;
    }
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handleVerify = async () => {
    if (otp.length !== 4 || verifyingRef.current || verified) return;
    verifyingRef.current = true;
    setLoading(true);
    setError('');
    // Verify OTP via n8n webhook (real WhatsApp code)
    try {
      const result = await verifyOtp({ phone, code: otp, name, email });
      if (!result.success) {
        verifyingRef.current = false;
        setError('Invalid code. Please check your WhatsApp and try again.');
        setOtp('');
        setLoading(false);
        return;
      }
    } catch {
      verifyingRef.current = false;
      setError('Could not verify code. Please try again.');
      setOtp('');
      setLoading(false);
      return;
    }

    // Update whatsapp_verified in profiles (best-effort, don't block on failure)
    try {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (user) {
        const { error: updateErr } = await (supabase
          .from('profiles') as any)
          .update({ whatsapp_verified: true })
          .eq('id', user.id);
        if (updateErr) {
          await (supabase.from('profiles') as any).upsert({
            id: user.id,
            name: name || user.user_metadata?.name || user.email || 'User',
            whatsapp: phone,
            whatsapp_verified: true,
          } as any);
        }
      }
    } catch (err) {
      console.error('Profile update failed (non-blocking):', err);
    }

    setVerified(true);
    if (!toastFiredRef.current) {
      toastFiredRef.current = true;
      toast.success('WhatsApp verified! Welcome to nfstay!');
    }

    // ── Social login: create Supabase account now (wallet already known) ──
    if (authMethod && wallet) {
      try {
        const uuid = (() => { try { return sessionStorage.getItem('particle_uuid') || ''; } catch { return ''; } })();
        if (uuid) {
          const pw = derivedPassword(uuid);
          // Try sign up (new user)
          const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
            email,
            password: pw,
            options: { data: { name } },
          });
          let userId: string | undefined = signUpData?.user?.id;

          if (signUpErr || !userId) {
            // Already registered — sign in instead
            const { data: signInData } = await supabase.auth.signInWithPassword({ email, password: pw });
            userId = signInData?.user?.id;
          }

          if (userId) {
            await (supabase.from('profiles') as any)
              .upsert({
                id: userId,
                name: name || email.split('@')[0],
                whatsapp: phone,
                whatsapp_verified: true,
                wallet_address: wallet,
                wallet_auth_method: authMethod,
              } as any);
            console.log('[VerifyOtp] Social profile saved. wallet:', wallet, 'authMethod:', authMethod);
          }
        }
      } catch (err) {
        console.error('[VerifyOtp] Social account creation failed (non-blocking):', err);
      }

      setTimeout(() => { window.location.href = '/dashboard/deals'; }, 1500);
      setLoading(false);
      return;
    }

    // ── JWT path: generate JWT and store for WalletProvisioner ────────────
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      if (userId) {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://asazddtvjvmckouxcmmo.supabase.co';
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
        const jwtRes = await fetch(`${supabaseUrl}/functions/v1/particle-generate-jwt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey },
          body: JSON.stringify({ user_id: userId }),
        });
        const jwtData = await jwtRes.json();
        if (jwtData.jwt) {
          try { sessionStorage.setItem('particle_jwt', jwtData.jwt); } catch { /* skip */ }
          console.log('Particle JWT stored for wallet creation on dashboard');
        }
      }
    } catch (err) {
      console.log('JWT generation skipped (non-blocking):', err);
    }

    setTimeout(() => {
      window.location.href = '/dashboard/deals';
    }, 1500);
    setLoading(false);
  };

  // Auto-verify when 4 digits entered
  useEffect(() => {
    if (otp.length === 4 && !verifyingRef.current && !verified) handleVerify();
  }, [otp]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleResend = async () => {
    if (!canResend && timer > 0) return;
    setLoading(true);
    setError('');
    try {
      await sendOtp(phone);
      toast.success('New code sent via WhatsApp');
      setTimer(300);
      setCanResend(false);
    } catch {
      setError('Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  if (!phone) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-muted-foreground">No phone number provided.</p>
          <Link to="/signup" className="text-primary font-semibold mt-2 inline-block">
            Go to signup
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div data-feature="AUTH" className="min-h-screen flex">
      {/* Form side */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-8 relative z-10">
        <div className="w-full max-w-[400px]">
          <a href="/" className="text-xl font-extrabold text-foreground tracking-tight">
            nfstay
          </a>

          <button
            onClick={() => navigate('/signup')}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mt-8 mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to signup
          </button>

          <AnimatePresence mode="wait">
            {verified ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                >
                  <CheckCircle2 className="w-16 h-16 mx-auto" style={{ color: '#00D084' }} />
                </motion.div>
                <h1 className="text-[28px] font-bold text-foreground mt-4">Verified!</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Redirecting to your dashboard...
                </p>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h1 className="text-[28px] font-bold text-foreground">Verify your WhatsApp</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  We sent a 4-digit code to{' '}
                  <span className="font-medium text-foreground">{phone}</span> via WhatsApp.
                </p>

                {/* Timer */}
                <div className="mt-6 flex items-center justify-center gap-2">
                  <div
                    className="text-sm font-mono font-semibold px-3 py-1 rounded-full"
                    style={{
                      background: timer > 60 ? 'rgba(0,208,132,0.1)' : 'rgba(239,68,68,0.1)',
                      color: timer > 60 ? '#00D084' : '#EF4444',
                    }}
                  >
                    {formatTime(timer)}
                  </div>
                  <span className="text-xs text-muted-foreground">remaining</span>
                </div>

                {/* OTP input */}
                <div data-feature="AUTH__OTP_INPUT" className="mt-6 flex justify-center">
                  <InputOTP
                    maxLength={4}
                    value={otp}
                    onChange={(val) => {
                      setOtp(val);
                      setError('');
                    }}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="w-14 h-14 text-xl" />
                      <InputOTPSlot index={1} className="w-14 h-14 text-xl" />
                      <InputOTPSlot index={2} className="w-14 h-14 text-xl" />
                      <InputOTPSlot index={3} className="w-14 h-14 text-xl" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-500 text-center mt-3"
                  >
                    {error}
                  </motion.p>
                )}

                {/* Verify button */}
                <button
                  data-feature="AUTH__OTP_SUBMIT"
                  onClick={handleVerify}
                  disabled={loading || otp.length !== 4}
                  className="w-full h-12 rounded-lg text-white font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-6"
                  style={{ background: '#00D084' }}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  {loading ? 'Verifying...' : 'Verify WhatsApp'}
                </button>

                {/* Resend */}
                <button
                  data-feature="AUTH__OTP_RESEND"
                  onClick={handleResend}
                  disabled={loading || (!canResend && timer > 0)}
                  className="w-full text-sm text-muted-foreground hover:text-foreground mt-3 disabled:opacity-50 transition-opacity"
                >
                  {canResend
                    ? "Didn't receive it? Resend code"
                    : `Resend available in ${formatTime(timer)}`}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right panel */}
      <div
        className="hidden lg:flex flex-1 items-center justify-center p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, hsl(152 76% 36%) 0%, hsl(215 50% 11%) 100%)' }}
      >
        <div className="absolute inset-0 backdrop-blur-3xl pointer-events-none z-0" />
        <div className="relative z-10 max-w-[400px]">
          <h2 className="text-[28px] font-bold text-white">Almost there!</h2>
          <p className="text-base mt-4 text-white/70">
            Verify your WhatsApp to unlock deal alerts, agent support, and your full nfstay dashboard.
          </p>
          <div className="mt-8 space-y-3">
            {[
              'Instant deal alerts via WhatsApp',
              'Direct agent messaging',
              'Priority support channel',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-white/80 shrink-0" />
                <span className="text-sm text-white/80">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
