import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NFS_ROUTES } from '@/lib/nfstay/constants';

export default function NfsOperatorSignup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const redirectTo = searchParams.get('redirect') || NFS_ROUTES.DASHBOARD;

  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // If already logged in, redirect
  if (user) {
    navigate(redirectTo, { replace: true });
    return null;
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { data, error: authErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name: `${firstName} ${lastName}`.trim() },
          emailRedirectTo: `${window.location.origin}${NFS_ROUTES.DASHBOARD}`,
        },
      });

      if (authErr) {
        setError(authErr.message);
        return;
      }

      if (!data.user) {
        setError('Signup failed. Please try again.');
        return;
      }

      // Create nfs_operators row for this user
      // nfs_operators is not in auto-generated types — requires cast
      const { error: insertErr } = await (supabase.from('nfs_operators') as any).insert({
        profile_id: data.user.id,
        first_name: firstName || null,
        last_name: lastName || null,
        onboarding_step: 'account_setup',
      });

      if (insertErr) {
        // Table may not exist yet — log but don't block signup
        console.error('Failed to create operator record:', insertErr.message);
      }

      if (data.session) {
        // Auto-confirmed — redirect to dashboard
        navigate(NFS_ROUTES.DASHBOARD, { replace: true });
      } else {
        // Email confirmation required
        setSuccess('Check your email for a confirmation link, then sign in.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSignin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authErr) {
        setError(authErr.message);
        return;
      }

      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">NFStay</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === 'signup' ? 'Create your operator account' : 'Sign in to your account'}
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        <form onSubmit={mode === 'signup' ? handleSignup : handleSignin} className="space-y-4">
          {mode === 'signup' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jane"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Smith"
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              minLength={6}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {mode === 'signup' ? (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setMode('signin'); setError(null); setSuccess(null); }}
                className="text-primary hover:underline font-medium"
              >
                Sign in
              </button>
            </>
          ) : (
            <>
              Need an account?{' '}
              <button
                type="button"
                onClick={() => { setMode('signup'); setError(null); setSuccess(null); }}
                className="text-primary hover:underline font-medium"
              >
                Sign up
              </button>
            </>
          )}
        </p>

        <p className="text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:underline">Back to NFsTay</Link>
        </p>
      </div>
    </div>
  );
}
