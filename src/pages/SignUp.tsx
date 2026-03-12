import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

export default function SignUp() {
  const [showPw, setShowPw] = useState(false);
  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[400px]">
          <Link to="/" className="text-xl font-extrabold text-foreground tracking-tight">NFsTay</Link>
          <h1 className="text-[28px] font-bold text-foreground mt-8">Create your account</h1>
          <p className="text-sm text-muted-foreground mt-1">Get full access. No credit card needed.</p>

          <form className="mt-8 space-y-4" onSubmit={e => { e.preventDefault(); window.location.href = '/dashboard/deals'; }}>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Full name</label>
              <input type="text" placeholder="James Walker" className="input-nfstay w-full" />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Email</label>
              <input type="email" placeholder="you@example.com" className="input-nfstay w-full" />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} placeholder="Min 8 characters" className="input-nfstay w-full pr-10" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity">
              Get access, no credit card needed
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
