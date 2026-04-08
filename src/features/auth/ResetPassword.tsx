import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Eye, EyeOff, CheckCircle2, ArrowLeft, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export default function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      } else {
        setTimeout(() => {
          supabase.auth.getSession().then(({ data: { session: s } }) => {
            if (s) {
              setSessionReady(true);
            } else {
              setSessionError(true);
            }
          });
        }, 2000);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password.trim()) {
      setError(t('auth.pleaseEnterPassword'));
      return;
    }

    if (password.length < 6) {
      setError(t('auth.passwordMinLength'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('auth.passwordsDoNotMatch'));
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      setSuccess(true);
      toast.success('Password updated successfully!');
      setTimeout(() => navigate('/signin'), 3000);
    } catch {
      setError('Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sessionError && !sessionReady) {
    return (
      <div className="min-h-screen flex">
        <div className="flex-1 flex items-center justify-center p-6 md:p-8">
          <div className="w-full max-w-[400px] text-center">
            <a href="/" className="text-xl font-extrabold text-foreground tracking-tight">nfstay</a>
            <div className="mt-12">
              <Lock className="w-16 h-16 mx-auto text-muted-foreground/40" />
              <h1 className="text-[28px] font-bold text-foreground mt-4">{t('auth.invalidOrExpiredLink')}</h1>
              <p className="text-sm text-muted-foreground mt-2 max-w-[300px] mx-auto">
                {t('auth.expiredLinkMessage')}
              </p>
              <Link
                to="/forgot-password"
                className="inline-block mt-6 px-6 py-3 rounded-lg font-semibold text-white hover:opacity-90 transition-all"
                style={{ background: '#00D084' }}
              >
                {t('auth.requestNewLink')}
              </Link>
            </div>
          </div>
        </div>

        <div
          className="hidden lg:flex flex-1 items-center justify-center p-12 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, hsl(152 76% 36%) 0%, hsl(215 50% 11%) 100%)' }}
        >
          <div className="absolute inset-0 backdrop-blur-3xl" />
          <div className="relative max-w-[400px]">
            <h2 className="text-[28px] font-bold text-white">{t('auth.dontWorry')}</h2>
            <p className="text-base mt-4 text-white/70">
              {t('auth.resetInSeconds')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!sessionReady && !sessionError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">{t('auth.verifyingResetLink')}</p>
        </div>
      </div>
    );
  }

  return (
    <div data-feature="AUTH" className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-6 md:p-8">
        <div className="w-full max-w-[400px]">
          <a href="/" className="text-xl font-extrabold text-foreground tracking-tight">nfstay</a>

          <Link
            to="/signin"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mt-8 mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> {t('auth.backToSignIn')}
          </Link>

          <AnimatePresence mode="wait">
            {success ? (
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
                <h1 className="text-[28px] font-bold text-foreground mt-4">{t('auth.passwordUpdated')}</h1>
                <p className="text-sm text-muted-foreground mt-2 max-w-[300px] mx-auto">
                  {t('auth.passwordResetSuccess')}
                </p>
                <Link
                  to="/signin"
                  className="text-sm text-primary font-semibold mt-6 inline-block hover:underline"
                >
                  {t('auth.goToSignIn')}
                </Link>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h1 className="text-[28px] font-bold text-foreground">{t('auth.setNewPassword')}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('auth.enterNewPasswordBelow')}
                </p>

                <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1.5">{t('auth.newPassword')}</label>
                    <div className="relative">
                      <input
                        data-feature="AUTH__RESET_PASSWORD"
                        type={showPassword ? 'text' : 'password'}
                        placeholder={t('auth.newPasswordPlaceholder')}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(''); }}
                        className="input-nfstay w-full pr-10"
                        required
                        minLength={6}
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
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1.5">{t('auth.confirmPassword')}</label>
                    <div className="relative">
                      <input
                        data-feature="AUTH__RESET_CONFIRM"
                        type={showConfirm ? 'text' : 'password'}
                        placeholder={t('auth.confirmPasswordPlaceholder')}
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                        className="input-nfstay w-full pr-10"
                        required
                        minLength={6}
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
                  </div>

                  {error && <p className="text-sm text-red-500">{error}</p>}

                  <button
                    data-feature="AUTH__RESET_SUBMIT"
                    type="submit"
                    disabled={loading || !password.trim() || !confirmPassword.trim()}
                    className="w-full h-12 rounded-lg font-semibold text-white hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ background: '#00D084' }}
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {t('auth.updatePassword')}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-sm text-muted-foreground mt-6 text-center">
            {t('auth.rememberPassword')} <Link to="/signin" className="text-primary font-semibold">{t('auth.signIn')}</Link>
          </p>
        </div>
      </div>

      <div
        className="hidden lg:flex flex-1 items-center justify-center p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, hsl(152 76% 36%) 0%, hsl(215 50% 11%) 100%)' }}
      >
        <div className="absolute inset-0 backdrop-blur-3xl" />
        <div className="relative max-w-[400px]">
          <h2 className="text-[28px] font-bold text-white">{t('auth.almostThere')}</h2>
          <p className="text-base mt-4 text-white/70">
            {t('auth.setNewPasswordMessage')}
          </p>
        </div>
      </div>
    </div>
  );
}
