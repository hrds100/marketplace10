import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function SignIn() {
  const [showPw, setShowPw] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      navigate('/dashboard/deals');
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[400px]">
          <Link to="/" className="text-xl font-extrabold text-foreground tracking-tight">NFsTay</Link>
          <h1 className="text-[28px] font-bold text-foreground mt-8">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to access your deals and pipeline.</p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="input-nfstay w-full" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="input-nfstay w-full pr-10" required />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full h-12 rounded-lg bg-nfstay-black text-nfstay-black-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
              {loading ? 'Signing in...' : 'Sign in'}
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
