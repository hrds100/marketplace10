import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function SignIn() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError('');
    try {
      const { error: authError } = await signIn(email, password);
      if (authError) {
        setError(authError.message);
        return;
      }
      toast.success('Welcome back!');
      navigate('/dashboard/deals');
    } catch {
      setError('Sign in failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[400px]">
          <Link to="/" className="text-xl font-extrabold text-foreground tracking-tight">NFsTay</Link>

          <h1 className="text-[28px] font-bold text-foreground mt-8">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to your NFsTay account.</p>

          <form className="mt-8 space-y-4" onSubmit={handleSignIn}>
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
              <input
                type="password"
                placeholder="Your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input-nfstay w-full"
                required
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading || !email.trim() || !password.trim()}
              className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
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

      <div className="hidden lg:flex flex-1 items-center justify-center p-12" style={{ background: 'hsl(215 50% 11%)' }}>
        <div className="max-w-[400px]">
          <h2 className="text-[28px] font-bold" style={{ color: 'white' }}>Find verified rent-to-rent deals across the UK</h2>
          <p className="text-base mt-4" style={{ color: 'hsl(215 20% 65%)' }}>1,800+ landlord-approved listings. CRM tools. Airbnb University. Everything you need to build a portfolio.</p>
          <div className="flex -space-x-2 mt-8">
            {[1,2,3,4,5].map(i => <img key={i} src={`https://picsum.photos/seed/auth-av${i}/48/48`} className="w-10 h-10 rounded-full border-2" style={{ borderColor: 'hsl(215 50% 11%)' }} alt="" />)}
          </div>
          <p className="text-sm mt-3" style={{ color: 'hsl(215 20% 65%)' }}>4,200+ UK operators trust NFsTay</p>
        </div>
      </div>
    </div>
  );
}
