import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) {
        setError(resetError.message);
        return;
      }
      setSent(true);
      toast.success('Reset link sent to your email');
    } catch {
      setError('Failed to send reset link. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-feature="AUTH" className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-6 md:p-8">
        <div className="w-full max-w-[400px]">
          <a href="/" className="text-xl font-extrabold text-foreground tracking-tight">nfstay</a>

          <Link
            to="/signin"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mt-8 mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
          </Link>

          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div
                key="sent"
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
                <h1 className="text-[28px] font-bold text-foreground mt-4">Check your email</h1>
                <p className="text-sm text-muted-foreground mt-2 max-w-[300px] mx-auto">
                  We sent a password reset link to <span className="font-medium text-foreground">{email}</span>. Check your inbox and spam folder.
                </p>
                <button
                  onClick={() => { setSent(false); setEmail(''); }}
                  className="text-sm text-primary font-semibold mt-6 hover:underline"
                >
                  Try a different email
                </button>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h1 className="text-[28px] font-bold text-foreground">Reset your password</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Enter the email you used to sign up and we'll send you a reset link.
                </p>

                <form className="mt-8 space-y-4" onSubmit={handleReset}>
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1.5">Email address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="email"
                        placeholder="james@example.com"
                        value={email}
                        onChange={e => { setEmail(e.target.value); setError(''); }}
                        className="input-nfstay w-full pl-10"
                        required
                      />
                    </div>
                  </div>

                  {error && <p className="text-sm text-red-500">{error}</p>}

                  <button
                    type="submit"
                    disabled={loading || !email.trim()}
                    className="w-full h-12 rounded-lg font-semibold text-white hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ background: '#00D084' }}
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Send reset link
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-sm text-muted-foreground mt-6 text-center">
            Remember your password? <Link to="/signin" className="text-primary font-semibold">Sign in</Link>
          </p>
        </div>
      </div>

      <div
        className="hidden lg:flex flex-1 items-center justify-center p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, hsl(152 76% 36%) 0%, hsl(215 50% 11%) 100%)' }}
      >
        <div className="absolute inset-0 backdrop-blur-3xl" />
        <div className="relative max-w-[400px]">
          <h2 className="text-[28px] font-bold text-white">Don't worry, it happens!</h2>
          <p className="text-base mt-4 text-white/70">
            Reset your password in seconds and get back to finding deals.
          </p>
        </div>
      </div>
    </div>
  );
}
