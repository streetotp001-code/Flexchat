import React, { useState } from 'react';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider, syncUserProfile } from '../firebase';
import { Logo } from './Logo';
import { Mail, Lock, User, Eye, EyeOff, AlertCircle, CheckCircle, ArrowRight, Sparkles } from 'lucide-react';

interface AuthModalProps {
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await signInWithPopup(auth, googleProvider);
      if (res.user) {
        await syncUserProfile(res.user);
        onSuccess?.();
      }
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      if (err.code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please allow popups for this site or use email login.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('Authorized domain notice: Please verify this domain in Firebase Console under Auth settings.');
      } else {
        setError(err.message || 'Failed to sign in with Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (!fullName.trim()) {
          throw new Error('Please enter your full name');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }
        const userCred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(userCred.user, {
          displayName: fullName.trim(),
        });
        await syncUserProfile(userCred.user, { fullName: fullName.trim() });
        setSuccessMsg('Account created successfully!');
        onSuccess?.();
      } else if (mode === 'signin') {
        const userCred = await signInWithEmailAndPassword(auth, email.trim(), password);
        await syncUserProfile(userCred.user);
        onSuccess?.();
      } else if (mode === 'forgot') {
        if (!email.trim()) {
          throw new Error('Please enter your email address to receive reset link');
        }
        await sendPasswordResetEmail(auth, email.trim());
        setSuccessMsg('Password reset link sent! Check your inbox.');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let msg = err.message || 'Authentication failed';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Invalid email or password. Please try again.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'This email is already registered. Please sign in instead.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo / Secondary Tester Login (useful for testing two participants on the same machine)
  const handleQuickDemoLogin = async (demoName: string, demoEmail: string) => {
    setLoading(true);
    setError(null);
    try {
      // Try to sign in or create dummy account
      try {
        const cred = await signInWithEmailAndPassword(auth, demoEmail, 'flexchat1234');
        await syncUserProfile(cred.user, { fullName: demoName });
      } catch (err: any) {
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          const cred = await createUserWithEmailAndPassword(auth, demoEmail, 'flexchat1234');
          await updateProfile(cred.user, { displayName: demoName });
          await syncUserProfile(cred.user, { fullName: demoName });
        } else {
          throw err;
        }
      }
      onSuccess?.();
    } catch (e: any) {
      setError('Demo login note: ' + (e.message || 'Failed to authenticate test profile'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between relative overflow-hidden">
      {/* Decorative background circle */}
      <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-sky-100 opacity-60 blur-3xl pointer-events-none" />
      <div className="absolute -top-20 -left-20 w-60 h-60 rounded-full bg-red-100 opacity-50 blur-3xl pointer-events-none" />

      {/* Main card */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-6 sm:p-8 relative">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <Logo size="lg" layout="vertical" />
            <div className="mt-4">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                {mode === 'signup' && 'Create Your Account'}
                {mode === 'signin' && 'Welcome Back!'}
                {mode === 'forgot' && 'Reset Password'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                {mode === 'signup' && 'Join FLEXchat to connect, call, and be closer.'}
                {mode === 'signin' && 'Sign in to continue to your account'}
                {mode === 'forgot' && 'Enter your email to receive recovery instructions'}
              </p>
            </div>
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-700">
              <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {mode !== 'forgot' && (
            <>
              {/* Google Sign In Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 rounded-2xl font-semibold text-slate-700 text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{mode === 'signup' ? 'Sign up with Google' : 'Sign in with Google'}</span>
              </button>

              {/* Divider */}
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase font-medium">
                  <span className="bg-white px-3 text-slate-400">OR</span>
                </div>
              </div>
            </>
          )}

          {/* Form */}
          <form onSubmit={handleEmailAuth} className="space-y-3.5">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Sarah Williams"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF1F35]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF1F35]"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">Password</label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-xs text-[#19B9F4] hover:underline font-medium"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF1F35]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Primary Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 mt-2 bg-[#FF1F35] hover:bg-[#e0192d] active:bg-[#c91426] text-white font-bold rounded-2xl text-sm shadow-md shadow-red-200 transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>
                    {mode === 'signin' && 'Sign In'}
                    {mode === 'signup' && 'Create Account'}
                    {mode === 'forgot' && 'Send Recovery Email'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle modes */}
          <div className="mt-5 text-center text-xs text-slate-500">
            {mode === 'signin' ? (
              <span>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="font-bold text-[#FF1F35] hover:underline"
                >
                  Sign Up
                </button>
              </span>
            ) : mode === 'signup' ? (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="font-bold text-[#19B9F4] hover:underline"
                >
                  Sign In
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setMode('signin')}
                className="font-bold text-slate-700 hover:underline"
              >
                Back to Sign In
              </button>
            )}
          </div>

          {/* Quick Demo Accounts Helper (For convenient multi-user testing) */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#FFD51B]" /> Quick Test Profiles
              </span>
              <span className="text-[10px] text-slate-400">Instant test login</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('Sarah Williams', 'sarah.williams@demo.flexchat.com')}
                className="text-left px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-sky-50 text-[11px] transition-colors"
              >
                <div className="font-semibold text-slate-800 truncate">Sarah Williams</div>
                <div className="text-[10px] text-slate-400 truncate">sarah.williams@demo</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('Michael Brown', 'michael.brown@demo.flexchat.com')}
                className="text-left px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-red-300 hover:bg-red-50 text-[11px] transition-colors"
              >
                <div className="font-semibold text-slate-800 truncate">Michael Brown</div>
                <div className="text-[10px] text-slate-400 truncate">michael.brown@demo</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Branded Bottom Wave Swooshes (matching visual design in mockup) */}
      <div className="relative w-full h-16 sm:h-20 overflow-hidden pointer-events-none">
        <svg
          viewBox="0 0 500 100"
          preserveAspectRatio="none"
          className="w-full h-full absolute bottom-0 left-0"
        >
          {/* Sky blue background wave */}
          <path d="M0,40 C150,95 350,10 500,60 L500,100 L0,100 Z" fill="#19B9F4" />
          {/* Yellow wave */}
          <path d="M0,60 C120,20 280,90 500,50 L500,100 L0,100 Z" fill="#FFD51B" opacity="0.9" />
          {/* Red front wave */}
          <path d="M0,75 C90,45 220,100 420,70 L500,85 L500,100 L0,100 Z" fill="#FF1F35" />
        </svg>
      </div>
    </div>
  );
};
