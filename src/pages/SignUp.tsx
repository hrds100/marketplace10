import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function SignUp() {
  const [showPw, setShowPw] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      toast.error('Please agree to the Terms of Service');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    const { error } = await signUp(email, password, name, whatsapp);
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Account created! Redirecting...');
      navigate('/dashboard/deals');
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[400px]">
          <Link to="/" className="text-xl font-extrabold text-foreground tracking-tight">NFsTay</Link>
          <h1 className="text-[28px] font-bold text-foreground mt-8">Create your account</h1>
          <p className="text-sm text-muted-foreground mt-1">Get full access. No credit card needed.</p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Full name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="James Walker" className="input-nfstay w-full" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="input-nfstay w-full" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" className="input-nfstay w-full pr-10" required />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">WhatsApp Number</label>
              <input type="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="+44 7911 123456" className="input-nfstay w-full" required />
              <p className="text-[11px] text-muted-foreground mt-1">📱 WhatsApp required for OTP verification</p>
            </div>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-1 w-4 h-4 rounded border-border text-primary focus:ring-primary" />
              <span className="text-xs text-muted-foreground">I agree to the <a href="#" className="text-primary font-semibold">Terms of Service</a> and <a href="#" className="text-primary font-semibold">Privacy Policy</a></span>
            </label>
            <button type="submit" disabled={loading} className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
              {loading ? 'Creating account...' : 'Get access, no credit card needed'}
            </button>
            <p className="text-xs text-muted-foreground text-center">Cancel any time. No commitment.</p>
          </form>

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
