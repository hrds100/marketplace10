import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, ArrowLeft, CheckCircle2, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { sendOtp, verifyOtp } from '@/core/auth/otp';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import CountryCodeSelect from '@/components/CountryCodeSelect';
import { useTranslation } from 'react-i18next';


// Derive a deterministic Supabase password from Particle UUID (must match SignUp.tsx)
function derivedPassword(uuid: string): string {
  return uuid.slice(0, 10) + '_NFsTay2!' + uuid.slice(-6);
}

export default function VerifyOtp() {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
  const [phoneInput, setPhoneInput] = useState('');
  const [countryCode, setCountryCode] = useState('+44');
  const [sendingOtp, setSendingOtp] = useState(false);

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
    // Verify OTP via edge function (real WhatsApp code)
    try {
      const result = await verifyOtp({ phone, code: otp, name, email });
      if (!result.success) {
        verifyingRef.current = false;
        setError(t('auth.invalidCode'));
        setOtp('');
        setLoading(false);
        return;
      }
    } catch {
      verifyingRef.current = false;
      setError(t('auth.couldNotVerify'));
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
          .update({ whatsapp_verified: true, whatsapp: phone, email: email || null })
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
      toast.success(t('auth.whatsAppVerified'));
    }

    // ── Social login: create Supabase account now (wallet already known) ──
    if (authMethod && wallet) {
      let socialUserId: string | undefined;
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
          socialUserId = signUpData?.user?.id;

          if (signUpErr || !socialUserId) {
            // Already registered — sign in instead
            const { data: signInData } = await supabase.auth.signInWithPassword({ email, password: pw });
            socialUserId = signInData?.user?.id;
          }

          if (socialUserId) {
            const refCode = localStorage.getItem('nfstay_ref');
            await (supabase.from('profiles') as any)
              .upsert({
                id: socialUserId,
                name: name || email.split('@')[0],
                whatsapp: phone,
                whatsapp_verified: true,
                wallet_address: wallet,
                wallet_auth_method: authMethod,
                ...(refCode ? { referred_by: refCode } : {}),
              } as any);

            // Track referral signup
            if (refCode) {
              const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://asazddtvjvmckouxcmmo.supabase.co';
              fetch(`${supabaseUrl}/functions/v1/track-referral?code=${encodeURIComponent(refCode)}&event=signup&userId=${socialUserId}&userName=${encodeURIComponent(name)}&userEmail=${encodeURIComponent(email)}`, { method: 'POST' }).catch(() => {});
              localStorage.removeItem('nfstay_ref');
            }
          }
        }
      } catch (err) {
        console.error('[VerifyOtp] Social account creation failed (non-blocking):', err);
      }

      // Sync new signup to GoHighLevel (fire-and-forget, never blocks)
      supabase.functions.invoke('ghl-signup-sync', {
        body: { user_id: socialUserId, name, email, phone, wallet_address: wallet },
      }).catch((err) => console.error('[VerifyOtp] ghl-signup-sync failed (non-blocking):', err));

      setTimeout(() => { window.location.href = '/dashboard/deals'; }, 1500);
      setLoading(false);
      return;
    }

    // ── Email signup: create wallet BEFORE dashboard (was deferred before) ──
    let emailWalletAddress: string | null = null;
    try {
      const { data: authData } = await supabase.auth.getUser();
      const emailUserId = authData?.user?.id;
      if (emailUserId) {
        // If a wallet already exists (e.g. social-signin user passing through OTP), use it
        const { data: existingProfile } = await (supabase.from('profiles') as any)
          .select('wallet_address')
          .eq('id', emailUserId)
          .single();
        emailWalletAddress = existingProfile?.wallet_address || null;

        if (!emailWalletAddress) {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://asazddtvjvmckouxcmmo.supabase.co';
          const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

          // Retry up to 3 times with backoff — Particle can be slow/flaky
          for (let attempt = 0; attempt < 3 && !emailWalletAddress; attempt++) {
            try {
              if (attempt > 0) await new Promise((r) => setTimeout(r, 800));
              const jwtRes = await fetch(`${supabaseUrl}/functions/v1/particle-generate-jwt`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey },
                body: JSON.stringify({ user_id: emailUserId }),
              });
              const jwtData = await jwtRes.json();
              if (!jwtData?.jwt) continue;

              const { createParticleWallet, destroyIframe } = await import('@/lib/particleIframe');
              const address = await createParticleWallet(jwtData.jwt);
              destroyIframe();
              if (address) {
                emailWalletAddress = address;
                await (supabase.from('profiles') as any)
                  .update({ wallet_address: address, wallet_auth_method: 'jwt' })
                  .eq('id', emailUserId);
              }
            } catch (err) {
              console.log(`[VerifyOtp] Wallet attempt ${attempt + 1} failed:`, (err as any)?.message || err);
            }
          }

          if (!emailWalletAddress) {
            // Fallback: WalletProvisioner on the dashboard will retry silently
            toast('Wallet setup will continue in the background.');
          }
        }

        // Sync new signup to GoHighLevel (fire-and-forget, never blocks)
        supabase.functions.invoke('ghl-signup-sync', {
          body: { user_id: emailUserId, name, email, phone, wallet_address: emailWalletAddress },
        }).catch((err) => console.error('[VerifyOtp] ghl-signup-sync failed (non-blocking):', err));
      }
    } catch (err) {
      console.error('[VerifyOtp] Email wallet / GHL sync error (non-blocking):', err);
    }

    // ── Fallback referral tracking for email signups ────────────────────
    try {
      const refCode = localStorage.getItem('nfstay_ref');
      if (refCode) {
        const { data: authData } = await supabase.auth.getUser();
        const uid = authData?.user?.id;
        if (uid) {
          const sbUrl = import.meta.env.VITE_SUPABASE_URL || 'https://asazddtvjvmckouxcmmo.supabase.co';
          fetch(`${sbUrl}/functions/v1/track-referral?code=${encodeURIComponent(refCode)}&event=signup&userId=${uid}&userName=${encodeURIComponent(name)}&userEmail=${encodeURIComponent(email)}`, { method: 'POST' }).catch(() => {});
          (supabase.from('profiles') as any).update({ referred_by: refCode } as any).eq('id', uid).then(() => {}).catch(() => {});
          localStorage.removeItem('nfstay_ref');
        }
      }
    } catch { /* non-blocking */ }

    // Admin notification: new signup (email OTP)
    (supabase.from('notifications') as any).insert({
      type: 'new_signup',
      title: 'New user signed up',
      body: `${name} (${email}) signed up via email.`,
    }).then(() => {}).catch(() => {});

    // Wallet creation is handled by WalletProvisioner on the dashboard.
    // It shows a modal prompting the user to connect their wallet.
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

  const handleSendFirstOtp = async () => {
    if (!phoneInput.trim()) return;
    setSendingOtp(true);
    try {
      const fullPhone = countryCode + phoneInput.replace(/\s/g, '');
      await sendOtp(fullPhone);
      const newParams = new URLSearchParams(params);
      newParams.set('phone', fullPhone);
      navigate(`/verify-otp?${newParams.toString()}`, { replace: true });
    } catch {
      toast.error('Failed to send verification code');
    } finally {
      setSendingOtp(false);
    }
  };

  if (!phone) {
    return (
      <div data-feature="AUTH" className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-[400px]">
          <a href="/" className="text-xl font-extrabold text-foreground tracking-tight">nfstay</a>

          <h2 className="text-[22px] font-bold text-foreground mt-8 mb-1">{t('auth.addYourWhatsApp')}</h2>
          <p className="text-sm text-muted-foreground mb-6">{t('auth.oneLastStep')}</p>

          {name && (
            <p className="text-sm text-muted-foreground mb-4">
              {t('auth.signedInAs')} <span className="font-medium text-foreground">{name}</span>
              {email && <span className="text-muted-foreground"> ({email})</span>}
            </p>
          )}

          <div className="flex flex-col gap-1 mb-4">
            <label className="text-sm font-medium" style={{ color: '#525252' }}>
              {t('auth.whatsAppNumber')} <span className="text-red-500">*</span>
            </label>
            <div className="flex">
              <CountryCodeSelect value={countryCode} onChange={setCountryCode} />
              <div className="relative flex-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none" style={{ color: '#737373' }} />
                <input
                  type="tel"
                  placeholder="7863 992 555"
                  value={phoneInput}
                  onChange={e => setPhoneInput(e.target.value)}
                  className="w-full h-[41px] bg-white border rounded-r-[10px] text-sm outline-none transition-all duration-150 focus:border-[#1e9a80] focus:shadow-[0_0_0_3px_rgba(30,154,128,0.15)]"
                  style={{ borderColor: '#e5e5e5', color: '#0a0a0a', padding: '4px 12px 4px 40px', boxShadow: '0 4px 8px -1px rgba(0,0,0,0.05)' }}
                />
              </div>
            </div>
            <p className="text-[11px] mt-1" style={{ color: '#737373' }}>{t('auth.wellSendCode')}</p>
          </div>

          <button
            onClick={handleSendFirstOtp}
            disabled={sendingOtp || !phoneInput.trim()}
            className="w-full rounded-lg font-medium text-white transition-all duration-150 hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ height: 37, backgroundColor: '#1e9a80', fontSize: 16, padding: '8px 16px', border: 'none' }}
          >
            {sendingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {sendingOtp ? t('auth.sendingCode') : t('auth.sendVerificationCode')}
          </button>
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
            <ArrowLeft className="w-3.5 h-3.5" /> {t('auth.backToSignup')}
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
                <h1 className="text-[28px] font-bold text-foreground mt-4">{t('auth.verified')}</h1>

                <p className="text-sm text-muted-foreground mt-1">
                  {t('auth.redirectingToDashboard')}
                </p>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h1 className="text-[28px] font-bold text-foreground">{t('auth.verifyYourWhatsApp')}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('auth.codeSentTo', { phone })}
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
                  <span className="text-xs text-muted-foreground">{t('auth.remaining')}</span>
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
                  {loading ? t('auth.verifying') : t('auth.verifyWhatsApp')}
                </button>

                {/* Resend */}
                <button
                  data-feature="AUTH__OTP_RESEND"
                  onClick={handleResend}
                  disabled={loading || (!canResend && timer > 0)}
                  className="w-full text-sm text-muted-foreground hover:text-foreground mt-3 disabled:opacity-50 transition-opacity"
                >
                  {canResend
                    ? t('auth.didntReceive')
                    : `${t('auth.resendAvailableIn')} ${formatTime(timer)}`}
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
          <h2 className="text-[28px] font-bold text-white">{t('auth.almostThere')}</h2>
          <p className="text-base mt-4 text-white/70">
            {t('auth.verifyToUnlock')}
          </p>
          <div className="mt-8 space-y-3">
            {[
              t('auth.instantDealAlerts'),
              t('auth.directAgentMessaging'),
              t('auth.prioritySupportChannel'),
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
