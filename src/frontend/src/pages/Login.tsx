import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { chapterService } from '../services/chapterService';
import { authService } from '../services/authService';
import { Lock, Mail, Building2, ArrowLeft, UserPlus } from 'lucide-react';

interface Chapter {
  chapter_id: string;
  chapter_name: string;
}

export const LoginPage = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [chapterId, setChapterId] = useState<string>('');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'LOGIN' | 'FORGOT' | 'RESET' | 'REGISTER'>('LOGIN');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    chapterService
      .list()
      .then((chs) => {
        const normalize = (name: string) => name.trim().toLowerCase();
        const rankChapter = (name: string) => {
          const normalized = normalize(name);
          if (normalized.includes('hyderabad')) return 0;
          if (normalized.includes('bangalore')) return 1;
          return 2;
        };

        const orderedChapters = [...chs].sort((a, b) => {
          const rankDiff = rankChapter(a.chapter_name) - rankChapter(b.chapter_name);
          if (rankDiff !== 0) return rankDiff;
          return a.chapter_name.localeCompare(b.chapter_name);
        });

        setChapters(orderedChapters);

        if (orderedChapters.length > 0) {
          const defaultChapter =
            orderedChapters.find((ch) => normalize(ch.chapter_name).includes('hyderabad')) ?? orderedChapters[0];
          setChapterId(defaultChapter.chapter_id);
        }
      })
      .catch(() => {
        // Backend might not be running yet — allow manual entry
      });
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password, chapterId);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    const normalizedEmail = forgotEmail.trim();
    if (!normalizedEmail) {
      setError('Email is required');
      return;
    }

    const shouldSend = window.confirm(`Send password reset OTP to ${normalizedEmail}?`);
    if (!shouldSend) return;

    setForgotLoading(true);
    try {
      const msg = await authService.forgotPassword(normalizedEmail);
      setInfoMessage(msg);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setForgotLoading(false);
    }
  };

  const handlePartnerRegistrationRequest = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setRegisterLoading(true);
    try {
      const result = await authService.requestPartnerRegistration({ email: registerEmail, chapter_id: chapterId });
      setInfoMessage(result.message);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to request partner registration');
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleCompleteForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    if (!resetEmail.trim() || !resetOtp.trim()) {
      setError('Email and OTP are required.');
      return;
    }

    if (resetPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (resetPassword !== resetConfirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setResetLoading(true);
    try {
      const msg = await authService.completeForgotPassword({
        email: resetEmail.trim(),
        otp: resetOtp.trim(),
        password: resetPassword,
      });
      setInfoMessage(msg);
      setMode('LOGIN');
      setPassword('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 relative overflow-hidden items-center justify-center">
        {/* Decorative circles */}
        <div className="absolute top-[-80px] left-[-80px] w-64 h-64 rounded-full bg-white/10"></div>
        <div className="absolute bottom-[-120px] right-[-60px] w-96 h-96 rounded-full bg-white/5"></div>
        <div className="absolute top-1/3 right-10 w-32 h-32 rounded-full bg-white/5"></div>

        <div className="relative z-10 px-16 max-w-lg">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center overflow-hidden p-1.5">
              <img
                src="/svp_logo.png"
                alt="SVP India"
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fb = e.currentTarget.nextElementSibling as HTMLElement | null;
                  if (fb) fb.style.display = 'flex';
                }}
              />
              <span className="text-white font-bold text-xl hidden">S</span>
            </div>
            <h1 className="text-white text-3xl font-bold tracking-tight">SVP Analytics</h1>
          </div>
          <p className="text-blue-100 text-lg leading-relaxed mb-8">
            Manage partner engagement, track meetings, and gain insights into your chapter's impact - all in one place.
          </p>
          <div className="space-y-4">
            {[
              'Real-time engagement tracking',
              'Comprehensive analytics dashboard',
              'Streamlined appointment management',
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-blue-100">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm font-medium">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center overflow-hidden p-1.5">
              <img
                src="/svp_logo.png"
                alt="SVP India"
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fb = e.currentTarget.nextElementSibling as HTMLElement | null;
                  if (fb) fb.style.display = 'flex';
                }}
              />
              <span className="text-white font-bold text-lg hidden">S</span>
            </div>
            <h1 className="text-text text-2xl font-bold">SVP Analytics</h1>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-text">
              {mode === 'FORGOT'
                ? 'Reset Password'
                : mode === 'RESET'
                  ? 'Complete Password Reset'
                  : mode === 'REGISTER'
                    ? 'Register Partner Account'
                    : 'Welcome back'}
            </h2>
            <p className="text-textMuted mt-2">
              {mode === 'FORGOT'
                ? 'Enter your email to receive a password reset OTP'
                : mode === 'RESET'
                  ? 'Enter OTP and your new password'
                : mode === 'REGISTER'
                  ? 'Use your partner email to receive a temporary password'
                  : 'Sign in to your account to continue'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          {infoMessage && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {infoMessage}
            </div>
          )}

          {mode === 'FORGOT' ? (
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-text mb-2">Email address</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-background border border-surfaceHighlight rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full py-3 px-4 bg-primary hover:bg-primaryHover text-white font-semibold rounded-lg transition-all disabled:opacity-50 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98]"
              >
                {forgotLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Sending...
                  </span>
                ) : 'Send Reset OTP'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setResetEmail(forgotEmail.trim() || email.trim());
                  setMode('RESET');
                  setError('');
                  setInfoMessage('');
                }}
                className="w-full py-2 text-sm text-primary hover:text-primaryHover font-medium transition-colors"
              >
                Already have OTP? Reset Password
              </button>
              <button
                type="button"
                onClick={() => { setMode('LOGIN'); setError(''); setInfoMessage(''); }}
                className="w-full py-2 text-sm text-primary hover:text-primaryHover font-medium flex items-center justify-center gap-1 transition-colors"
              >
                <ArrowLeft size={16} /> Back to Sign In
              </button>
            </form>
          ) : mode === 'RESET' ? (
            <form onSubmit={handleCompleteForgotPassword} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-text mb-2">Email address</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-background border border-surfaceHighlight rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-2">OTP</label>
                <input
                  value={resetOtp}
                  onChange={(e) => setResetOtp(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-surfaceHighlight rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  placeholder="Enter OTP"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-2">New Password</label>
                <input
                  type="password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-surfaceHighlight rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-2">Confirm Password</label>
                <input
                  type="password"
                  value={resetConfirmPassword}
                  onChange={(e) => setResetConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-surfaceHighlight rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={resetLoading}
                className="w-full py-3 px-4 bg-primary hover:bg-primaryHover text-white font-semibold rounded-lg transition-all disabled:opacity-50 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98]"
              >
                {resetLoading ? 'Resetting Password...' : 'Reset Password'}
              </button>

              <button
                type="button"
                onClick={() => { setMode('FORGOT'); setError(''); setInfoMessage(''); }}
                className="w-full py-2 text-sm text-primary hover:text-primaryHover font-medium flex items-center justify-center gap-1 transition-colors"
              >
                <ArrowLeft size={16} /> Back to Forgot Password
              </button>
            </form>
          ) : mode === 'REGISTER' ? (
            <form onSubmit={handlePartnerRegistrationRequest} className="space-y-5">
              {chapters.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-text mb-2">Chapter</label>
                  <div className="relative">
                    <Building2 size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
                    <select
                      value={chapterId}
                      onChange={(e) => setChapterId(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-background border border-surfaceHighlight rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    >
                      {chapters.map((ch) => (
                        <option key={ch.chapter_id} value={ch.chapter_id}>
                          {ch.chapter_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-text mb-2">Partner Email</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
                  <input
                    type="email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-background border border-surfaceHighlight rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    placeholder="partner@svp.org"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={registerLoading || !chapterId}
                className="w-full py-3 px-4 bg-primary hover:bg-primaryHover text-white font-semibold rounded-lg transition-all disabled:opacity-50 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98]"
              >
                {registerLoading ? 'Sending Temporary Password...' : 'Send Temporary Password'}
              </button>

              <button
                type="button"
                onClick={() => { setMode('LOGIN'); setError(''); setInfoMessage(''); }}
                className="w-full py-2 text-sm text-primary hover:text-primaryHover font-medium flex items-center justify-center gap-1 transition-colors"
              >
                <ArrowLeft size={16} /> Back to Sign In
              </button>
            </form>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {chapters.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Chapter
                </label>
                <div className="relative">
                  <Building2 size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
                  <select
                    value={chapterId}
                    onChange={(e) => setChapterId(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-background border border-surfaceHighlight rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  >
                    {chapters.map((ch) => (
                      <option key={ch.chapter_id} value={ch.chapter_id}>
                        {ch.chapter_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Email address
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-background border border-surfaceHighlight rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  placeholder="admin@svp.org"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-background border border-surfaceHighlight rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-primary hover:bg-primaryHover text-white font-semibold rounded-lg transition-all disabled:opacity-50 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setForgotEmail((current) => current || email.trim());
                  setMode('FORGOT');
                  setError('');
                  setInfoMessage('');
                }}
                className="text-sm text-primary hover:text-primaryHover font-medium transition-colors"
              >
                Forgot Password?
              </button>
            </div>
            <div className="text-center -mt-2">
              <button
                type="button"
                onClick={() => { setMode('REGISTER'); setError(''); setInfoMessage(''); }}
                className="text-sm text-primary hover:text-primaryHover font-medium transition-colors inline-flex items-center gap-1"
              >
                <UserPlus size={14} /> Register Partner Account
              </button>
            </div>
          </form>
          )}

          <p className="mt-8 text-center text-sm text-textMuted">
            Social Venture Partners - Engagement Dashboard
          </p>
        </div>
      </div>
    </div>
  );
};
