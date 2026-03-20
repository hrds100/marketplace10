import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, Phone, CheckCircle2 } from 'lucide-react';
import AuthSlidePanel from '@/components/AuthSlidePanel';

/**
 * TEST PAGE — preview of the auth redesign.
 * No real auth logic — purely visual.
 * Visit: /testing/auth-redesign
 */

// Social provider icons (same SVGs used in real auth pages)
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const AppleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0 fill-current" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.43c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 3.96zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
  </svg>
);

const XIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0 fill-current" xmlns="http://www.w3.org/2000/svg">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2"/>
  </svg>
);

// Shared input component for this page
function AuthInput({
  icon: Icon,
  type = 'text',
  placeholder,
  id,
  hasToggle,
  showPassword,
  onToggle,
}: {
  icon: React.ElementType;
  type?: string;
  placeholder: string;
  id: string;
  hasToggle?: boolean;
  showPassword?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#737373] pointer-events-none" />
      <input
        type={hasToggle ? (showPassword ? 'text' : 'password') : type}
        id={id}
        placeholder={placeholder}
        className="w-full h-[41px] bg-white text-[#0a0a0a] border border-[#e5e5e5] rounded-[10px] text-sm font-normal outline-none transition-all duration-150 shadow-[0_4px_8px_-1px_rgba(0,0,0,0.05)] focus:border-[#1e9a80] focus:shadow-[0_0_0_3px_rgba(30,154,128,0.15)]"
        style={{ padding: hasToggle ? '4px 40px 4px 40px' : '4px 12px 4px 40px' }}
      />
      {hasToggle && onToggle && (
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer p-0.5 text-[#737373] hover:text-[#0a0a0a] flex items-center"
        >
          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      )}
    </div>
  );
}

export default function TestAuthRedesign() {
  const [activeTab, setActiveTab] = useState<'signin' | 'register'>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Password strength demo
  const [pw, setPw] = useState('');
  const strength = pw.length === 0 ? -1 : pw.length < 8 ? 0 : pw.length < 12 ? 1 : /[A-Z]/.test(pw) && /[^A-Za-z0-9]/.test(pw) ? 3 : 2;
  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['#EF4444', '#F59E0B', '#F97316', '#1e9a80'];

  return (
    <div className="min-h-screen w-full flex items-center justify-center" style={{ backgroundColor: '#f3f3ee' }}>
      <div className="flex w-full h-screen overflow-hidden p-2 gap-2" style={{ backgroundColor: '#f3f3ee' }}>

        {/* ══════ LEFT PANEL ══════ */}
        <div
          className="flex flex-col items-center justify-between flex-1 lg:w-1/2 w-full h-full overflow-y-auto bg-white rounded-3xl border"
          style={{ borderColor: '#e8e5df', padding: 'clamp(24px, 3.5vh, 64px)' }}
        >
          {/* Logo */}
          <div className="flex items-center justify-center w-full">
            <Link to="/" className="font-extrabold text-[#0a0a0a] tracking-tight" style={{ fontSize: 'clamp(18px, 2.5vh, 24px)' }}>
              NFsTay
            </Link>
          </div>

          {/* Centre content */}
          <div className="flex flex-col items-center justify-center w-full max-w-[480px] flex-1">

            {/* Heading */}
            <div className="text-center w-full" style={{ marginBottom: 'clamp(16px, 2.5vh, 32px)' }}>
              <h2
                className="font-semibold text-[#0a0a0a] leading-tight tracking-tight"
                style={{ fontSize: 'clamp(20px, 2.7vh, 30px)' }}
              >
                {activeTab === 'signin' ? 'Welcome back' : 'Create your account'}
              </h2>
              <p className="text-base text-[#737373] text-center mt-1.5 leading-relaxed">
                {activeTab === 'signin'
                  ? 'Sign in to your NFsTay account'
                  : 'Join thousands of operators building Airbnb portfolios'}
              </p>
            </div>

            {/* Tab switcher */}
            <div
              className="grid grid-cols-2 w-full border rounded-xl"
              style={{
                height: 40,
                gap: 2,
                backgroundColor: '#f3f3ee',
                borderColor: '#e8e5df',
                padding: 2,
                marginBottom: 'clamp(11px, 2vh, 29px)',
              }}
            >
              <button
                onClick={() => setActiveTab('signin')}
                className="flex items-center justify-center border-none rounded-[10px] text-sm font-medium cursor-pointer transition-all duration-150 outline-none h-full"
                style={{
                  backgroundColor: activeTab === 'signin' ? '#ffffff' : 'transparent',
                  color: activeTab === 'signin' ? '#1b1b1b' : '#73757c',
                  boxShadow: activeTab === 'signin' ? '0 1px 3px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                Sign In
              </button>
              <button
                onClick={() => setActiveTab('register')}
                className="flex items-center justify-center border-none rounded-[10px] text-sm font-medium cursor-pointer transition-all duration-150 outline-none h-full"
                style={{
                  backgroundColor: activeTab === 'register' ? '#ffffff' : 'transparent',
                  color: activeTab === 'register' ? '#1b1b1b' : '#73757c',
                  boxShadow: activeTab === 'register' ? '0 1px 3px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                Register
              </button>
            </div>

            {/* ─── SIGN IN FORM ─── */}
            {activeTab === 'signin' && (
              <div className="w-full flex flex-col" style={{ gap: 'clamp(9px, 1.8vh, 22px)' }}>
                <div className="flex flex-col gap-4">
                  {/* Email */}
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-[#525252] tracking-wide">Email</label>
                    <AuthInput icon={Mail} type="email" placeholder="Enter your email" id="si-email" />
                  </div>

                  {/* Password */}
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-[#525252] tracking-wide">Password</label>
                    <AuthInput
                      icon={Lock}
                      placeholder="Enter your password"
                      id="si-password"
                      hasToggle
                      showPassword={showPassword}
                      onToggle={() => setShowPassword(!showPassword)}
                    />
                  </div>
                </div>

                {/* Remember + Forgot */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      id="remember"
                      className="appearance-none w-5 h-5 border border-[#e5e5e5] rounded cursor-pointer transition-all duration-150 checked:bg-[#1e9a80] checked:border-[#1e9a80] bg-white"
                      style={{
                        backgroundImage: rememberMe
                          ? "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'%3E%3C/polyline%3E%3C/svg%3E\")"
                          : 'none',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        backgroundSize: '12px',
                      }}
                    />
                    <label htmlFor="remember" className="text-sm text-[#1b1b1b] cursor-pointer select-none">
                      Remember me
                    </label>
                  </div>
                  <button className="bg-transparent border-none text-[#1e9a80] text-sm font-medium cursor-pointer p-0 hover:underline">
                    Forgot Password?
                  </button>
                </div>

                {/* Submit */}
                <button
                  className="w-full rounded-lg font-medium text-white cursor-pointer transition-all duration-150 hover:opacity-90"
                  style={{
                    height: 37,
                    backgroundColor: '#1e9a80',
                    fontSize: 16,
                    padding: '8px 16px',
                    border: 'none',
                    boxShadow: '0 4px 8px -1px rgba(0,0,0,0.05)',
                  }}
                >
                  Sign In
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3 w-full">
                  <div className="h-px flex-1 bg-[#e5e5e5]" />
                  <span className="text-base text-[#737373] whitespace-nowrap">Or</span>
                  <div className="h-px flex-1 bg-[#e5e5e5]" />
                </div>

                {/* Social — 2×2 grid */}
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex gap-2">
                    <button className="flex-1 flex items-center justify-center gap-2 bg-transparent text-[#0a0a0a] border border-[#e5e5e5] rounded-full text-[15px] font-medium cursor-pointer transition-all duration-150 hover:bg-[#f5f5f5] hover:border-[#c8c8c8]" style={{ height: 45, padding: '8px 12px' }}>
                      <GoogleIcon /> Google
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-2 bg-transparent text-[#0a0a0a] border border-[#e5e5e5] rounded-full text-[15px] font-medium cursor-pointer transition-all duration-150 hover:bg-[#f5f5f5] hover:border-[#c8c8c8]" style={{ height: 45, padding: '8px 12px' }}>
                      <AppleIcon /> Apple
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 flex items-center justify-center gap-2 bg-transparent text-[#0a0a0a] border border-[#e5e5e5] rounded-full text-[15px] font-medium cursor-pointer transition-all duration-150 hover:bg-[#f5f5f5] hover:border-[#c8c8c8]" style={{ height: 45, padding: '8px 12px' }}>
                      <XIcon /> X
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-2 bg-transparent text-[#0a0a0a] border border-[#e5e5e5] rounded-full text-[15px] font-medium cursor-pointer transition-all duration-150 hover:bg-[#f5f5f5] hover:border-[#c8c8c8]" style={{ height: 45, padding: '8px 12px' }}>
                      <FacebookIcon /> Facebook
                    </button>
                  </div>
                </div>

                {/* Bottom link */}
                <p className="text-sm text-[#737373] text-center mt-2">
                  Don't have an account?{' '}
                  <button onClick={() => setActiveTab('register')} className="text-[#1e9a80] font-semibold bg-transparent border-none cursor-pointer p-0">
                    Sign up
                  </button>
                </p>
              </div>
            )}

            {/* ─── REGISTER FORM ─── */}
            {activeTab === 'register' && (
              <div className="w-full flex flex-col" style={{ gap: 'clamp(9px, 1.8vh, 22px)' }}>
                <div className="flex flex-col gap-4">
                  {/* Full name */}
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-[#525252] tracking-wide">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <AuthInput icon={User} placeholder="Enter full name" id="reg-name" />
                  </div>

                  {/* Email */}
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-[#525252] tracking-wide">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <AuthInput icon={Mail} type="email" placeholder="Enter your email" id="reg-email" />
                  </div>

                  {/* Password */}
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-[#525252] tracking-wide">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#737373] pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Min 8 characters"
                        value={pw}
                        onChange={(e) => setPw(e.target.value)}
                        className="w-full h-[41px] bg-white text-[#0a0a0a] border border-[#e5e5e5] rounded-[10px] text-sm font-normal outline-none transition-all duration-150 shadow-[0_4px_8px_-1px_rgba(0,0,0,0.05)] focus:border-[#1e9a80] focus:shadow-[0_0_0_3px_rgba(30,154,128,0.15)]"
                        style={{ padding: '4px 40px 4px 40px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer p-0.5 text-[#737373] hover:text-[#0a0a0a] flex items-center"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {/* Strength indicator */}
                    {pw.length > 0 && strength >= 0 && (
                      <div className="mt-2">
                        <div className="flex gap-1">
                          {[0, 1, 2, 3].map((i) => (
                            <div
                              key={i}
                              className="h-1 flex-1 rounded-full transition-all duration-300"
                              style={{ backgroundColor: i <= strength ? strengthColors[strength] : '#E5E7EB' }}
                            />
                          ))}
                        </div>
                        <p className="text-[11px] font-medium mt-1 transition-colors" style={{ color: strengthColors[strength] }}>
                          {strengthLabels[strength]}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Confirm password */}
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-[#525252] tracking-wide">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <AuthInput
                      icon={Lock}
                      placeholder="Re-enter password"
                      id="reg-confirm"
                      hasToggle
                      showPassword={showConfirm}
                      onToggle={() => setShowConfirm(!showConfirm)}
                    />
                  </div>

                  {/* WhatsApp number */}
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-[#525252] tracking-wide">
                      WhatsApp Number <span className="text-red-500">*</span>
                    </label>
                    <div className="flex">
                      {/* Simplified country code for preview */}
                      <div className="flex items-center gap-1.5 h-[41px] px-3 rounded-l-[10px] border border-r-0 border-[#e5e5e5] bg-white text-sm shrink-0 shadow-[0_4px_8px_-1px_rgba(0,0,0,0.05)]">
                        <span className="text-base leading-none">🇬🇧</span>
                        <span className="font-medium text-[#0a0a0a]">+44</span>
                        <svg className="w-3 h-3 text-[#737373]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                      <div className="relative flex-1">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#737373] pointer-events-none" />
                        <input
                          type="tel"
                          placeholder="7863 992 555"
                          className="w-full h-[41px] bg-white text-[#0a0a0a] border border-[#e5e5e5] rounded-r-[10px] text-sm font-normal outline-none transition-all duration-150 shadow-[0_4px_8px_-1px_rgba(0,0,0,0.05)] focus:border-[#1e9a80] focus:shadow-[0_0_0_3px_rgba(30,154,128,0.15)]"
                          style={{ padding: '4px 12px 4px 40px' }}
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-[#737373] mt-1">We'll send a verification code via WhatsApp</p>
                  </div>
                </div>

                {/* Terms */}
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5 appearance-none w-5 h-5 border border-[#e5e5e5] rounded cursor-pointer transition-all duration-150 checked:bg-[#1e9a80] checked:border-[#1e9a80] bg-white shrink-0"
                  />
                  <span className="text-xs text-[#737373] leading-relaxed">
                    I agree to the{' '}
                    <span className="text-[#1e9a80] font-semibold underline cursor-pointer">Terms of Service</span>
                    {' '}and{' '}
                    <span className="text-[#1e9a80] font-semibold underline cursor-pointer">Privacy Policy</span>
                    {' '}<span className="text-red-500">*</span>
                  </span>
                </label>

                {/* Submit */}
                <button
                  className="w-full rounded-lg font-medium text-white cursor-pointer transition-all duration-150 hover:opacity-90 flex items-center justify-center gap-2"
                  style={{
                    height: 37,
                    backgroundColor: '#1e9a80',
                    fontSize: 16,
                    padding: '8px 16px',
                    border: 'none',
                    boxShadow: '0 4px 8px -1px rgba(0,0,0,0.05)',
                  }}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Create account
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3 w-full">
                  <div className="h-px flex-1 bg-[#e5e5e5]" />
                  <span className="text-base text-[#737373] whitespace-nowrap">Or</span>
                  <div className="h-px flex-1 bg-[#e5e5e5]" />
                </div>

                {/* Social — stacked pills */}
                <div className="flex flex-col gap-2 w-full">
                  {[
                    { icon: <GoogleIcon />, label: 'Continue with Google' },
                    { icon: <AppleIcon />, label: 'Continue with Apple' },
                    { icon: <XIcon />, label: 'Continue with X' },
                    { icon: <FacebookIcon />, label: 'Continue with Facebook' },
                  ].map((p, i) => (
                    <button
                      key={i}
                      className="w-full flex items-center justify-center gap-2 bg-white text-[#0a0a0a] border border-[#e5e5e5] rounded-full text-[15px] font-medium cursor-pointer transition-all duration-150 hover:bg-[#f5f5f5] hover:border-[#c8c8c8]"
                      style={{ height: 45, padding: '8px 12px' }}
                    >
                      {p.icon}
                      <span>{p.label}</span>
                    </button>
                  ))}
                </div>

                {/* Bottom link */}
                <p className="text-sm text-[#737373] text-center mt-2">
                  Already have an account?{' '}
                  <button onClick={() => setActiveTab('signin')} className="text-[#1e9a80] font-semibold bg-transparent border-none cursor-pointer p-0">
                    Sign in
                  </button>
                </p>
              </div>
            )}
          </div>

          {/* Bottom spacer to keep form centred */}
          <div />
        </div>

        {/* ══════ RIGHT PANEL ══════ */}
        <AuthSlidePanel />
      </div>
    </div>
  );
}
