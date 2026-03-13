import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ArrowLeft } from 'lucide-react';
import { sendOtp, verifyOtp } from '@/lib/n8n';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { toast } from 'sonner';

type Step = 'phone' | 'otp';

export default function SignUp() {
  const [step, setStep] = useState<Step>('phone');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    setLoading(true);
    setError('');
    try {
      const formatted = phone.startsWith('+') ? phone : `+${phone}`;
      await sendOtp(formatted);
      setPhone(formatted);
      setStep('otp');
      toast.success('OTP sent via WhatsApp');
    } catch {
      setError('Failed to send OTP. Check your phone number.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      const result = await verifyOtp({ phone, code: otp, name, email: email || undefined });
      if (result.success) {
        localStorage.setItem('auth', JSON.stringify({ phone, name, email, ts: Date.now() }));
        toast.success('Welcome to NFsTay!');
        window.location.href = '/dashboard/deals';
      } else {
        setError(result.error || 'Invalid or expired OTP');
        setOtp('');
      }
    } catch {
      setError('Verification failed. Try again.');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    setError('');
    try {
      await sendOtp(phone);
      toast.success('New OTP sent');
    } catch {
      setError('Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[400px]">
          <Link to="/" className="text-xl font-extrabold text-foreground tracking-tight">NFsTay</Link>

          {step === 'phone' && (
            <>
              <h1 className="text-[28px] font-bold text-foreground mt-8">Create your account</h1>
              <p className="text-sm text-muted-foreground mt-1">We'll send a verification code via WhatsApp.</p>

              <form className="mt-8 space-y-4" onSubmit={handleSendOtp}>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">Full name</label>
                  <input
                    type="text"
                    placeholder="James Walker"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="input-nfstay w-full"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">Email <span className="font-normal text-muted-foreground">(optional)</span></label>
                  <input
                    type="email"
                    placeholder="james@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="input-nfstay w-full"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">WhatsApp number</label>
                  <input
                    type="tel"
                    placeholder="+44 7863 992555"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="input-nfstay w-full"
                    required
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">Include country code (e.g. +44)</p>
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <button
                  type="submit"
                  disabled={loading || !name.trim() || !phone.trim()}
                  className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Send verification code
                </button>
                <p className="text-xs text-muted-foreground text-center">Cancel any time. No commitment.</p>
              </form>
            </>
          )}

          {step === 'otp' && (
            <>
              <button
                onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mt-8 mb-4"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <h1 className="text-[28px] font-bold text-foreground">Enter verification code</h1>
              <p className="text-sm text-muted-foreground mt-1">
                We sent a 6-digit code to <span className="font-medium text-foreground">{phone}</span> via WhatsApp.
              </p>

              <div className="mt-8 flex justify-center">
                <InputOTP maxLength={6} value={otp} onChange={val => { setOtp(val); setError(''); }}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {error && <p className="text-sm text-red-500 text-center mt-3">{error}</p>}

              <button
                onClick={handleVerifyOtp}
                disabled={loading || otp.length !== 6}
                className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 mt-6"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Verify & create account
              </button>

              <button
                onClick={handleResend}
                disabled={loading}
                className="w-full text-sm text-muted-foreground hover:text-foreground mt-3 disabled:opacity-50"
              >
                Didn't receive it? Resend code
              </button>
            </>
          )}

          <p className="text-sm text-muted-foreground mt-6 text-center">
            Already have an account? <Link to="/signin" className="text-primary font-semibold">Sign in</Link>
          </p>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 items-center justify-center p-12" style={{ background: 'hsl(215 50% 11%)' }}>
        <div className="max-w-[400px]">
          <h2 className="text-[28px] font-bold" style={{ color: 'white' }}>Your rent-to-rent portfolio starts here</h2>
          <p className="text-base mt-4" style={{ color: 'hsl(215 20% 65%)' }}>Join thousands of operators using NFsTay to find and close deals faster.</p>
          <div className="flex -space-x-2 mt-8">
            {[1,2,3,4,5].map(i => <img key={i} src={`https://picsum.photos/seed/auth-av${i}/48/48`} className="w-10 h-10 rounded-full border-2" style={{ borderColor: 'hsl(215 50% 11%)' }} alt="" />)}
          </div>
          <p className="text-sm mt-3" style={{ color: 'hsl(215 20% 65%)' }}>4,200+ UK operators trust NFsTay</p>
        </div>
      </div>
    </div>
  );
}
