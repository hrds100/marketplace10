import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { sendOtp, verifyOtp } from '@/lib/n8n';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function VerifyOtp() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const phone = params.get('phone') || '';
  const name = params.get('name') || '';
  const email = params.get('email') || '';

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(300); // 5 min
  const [canResend, setCanResend] = useState(false);
  const verifyingRef = useRef(false);
  const toastFiredRef = useRef(false);

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
    try {
      const result = await verifyOtp({ phone, code: otp, name, email });
      if (result.success) {
        // Update whatsapp_verified in profiles — update first, upsert as fallback
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error: updateErr } = await supabase
            .from('profiles')
            .update({ whatsapp_verified: true } as Record<string, unknown>)
            .eq('id', user.id);
          if (updateErr) {
            // Profile doesn't exist — create it with all fields
            await supabase.from('profiles').upsert({
              id: user.id,
              name: name || user.user_metadata?.name || user.email,
              whatsapp: phone,
              whatsapp_verified: true,
            } as Record<string, unknown>);
          }
        }
        setVerified(true);
        if (!toastFiredRef.current) {
          toastFiredRef.current = true;
          toast.success('WhatsApp verified! Welcome to NFsTay!');
        }
        setTimeout(() => {
          window.location.href = '/dashboard/deals';
        }, 1500);
      } else {
        verifyingRef.current = false;
        setError(result.error || 'Invalid or expired code');
        setOtp('');
      }
    } catch {
      verifyingRef.current = false;
      setError('Verification failed. Try again.');
      setOtp('');
    } finally {
      setLoading(false);
    }
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
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Form side */}
      <div className="w-full lg:w-[42%] flex items-center justify-center p-6 md:p-8 lg:p-12">
        <div className="w-full max-w-md mx-auto">
          <Link to="/" className="text-xl font-extrabold text-foreground tracking-tight">
            NFsTay
          </Link>

          <button
            onClick={() => navigate('/signup')}
            className="flex items-center gap-1 text-sm opacity-60 hover:opacity-100 transition-opacity text-foreground mt-8 mb-4"
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
                <div className="mt-6 flex justify-center">
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

      {/* Right hero — matches signup */}
      <div className="hidden lg:flex lg:w-[58%] bg-[#FAFBFC] border-l border-gray-100">
        <div className="flex-1 flex flex-col justify-center px-12 xl:px-20 py-16 space-y-6">
          <h2 className="text-3xl xl:text-4xl font-bold text-gray-900 leading-tight">
            Almost there!
          </h2>
          <p className="text-lg text-gray-500 max-w-lg leading-relaxed">
            Verify your WhatsApp to unlock deal alerts, agent support, and your full NFsTay dashboard.
          </p>
          <div className="space-y-4 mt-4">
            {[
              'Instant deal alerts via WhatsApp',
              'Direct agent messaging',
              'Priority support channel',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <span className="text-base text-gray-700">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
