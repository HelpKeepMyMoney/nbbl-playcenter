import React, {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {
  formatAuthError,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from '@/src/lib/auth';
import {isFirebaseConfigured} from '@/src/lib/firebase';
import {upsertUserProfileFromAuth} from '@/src/lib/userProfile';

type AuthMode = 'signin' | 'signup';

const inputClass =
  'mt-1 w-full min-h-11 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-600/40';

type Loading = 'idle' | 'google' | 'email';

export function SignInScreen() {
  const [loading, setLoading] = useState<Loading>('idle');
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const configured = isFirebaseConfigured();

  const resetFormFields = () => {
    setPassword('');
    setConfirmPassword('');
  };

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError(null);
    resetFormFields();
  };

  const busy = loading !== 'idle';

  const onGoogle = async () => {
    setError(null);
    setLoading('google');
    try {
      const u = await signInWithGoogle();
      if (configured) {
        await upsertUserProfileFromAuth(u);
      }
    } catch (e) {
      setError(formatAuthError(e));
    } finally {
      setLoading('idle');
    }
  };

  const onEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setError('Enter your email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (mode === 'signup') {
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setLoading('email');
    try {
      const u =
        mode === 'signup'
          ? await signUpWithEmail(trimmed, password)
          : await signInWithEmail(trimmed, password);
      if (configured) {
        await upsertUserProfileFromAuth(u);
      }
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setLoading('idle');
    }
  };

  if (!configured) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6 bg-black text-white safe-pad-bottom">
        <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="font-display uppercase tracking-tight">Firebase setup</CardTitle>
            <CardDescription className="text-zinc-400">
              Add your web app config to <code className="text-red-400">.env.local</code> using{' '}
              <code className="text-red-400">.env.example</code> as a template, then restart the dev
              server.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-8 p-6 bg-black text-white safe-pad-bottom">
      <div className="text-center space-y-3 max-w-md">
        <div className="flex justify-center">
          <img src="/logo.png" alt="NBBL" className="h-14 w-14 object-contain" />
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight italic">
          <span className="text-white">NB</span>
          <span className="text-red-600">BL</span>
          <span className="text-white"> PlayCenter</span>
        </h1>
        <p className="text-zinc-400 text-sm leading-relaxed">
          Own your game. Sign in to record up to 60s clips and organize runs, highlights, and training
          in your private library.
        </p>
      </div>

      <Card className="w-full max-w-sm bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6 space-y-5">
          <div className="flex rounded-lg border border-zinc-800 p-0.5 bg-zinc-950/80">
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className={`flex-1 rounded-md py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
                mode === 'signin' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={`flex-1 rounded-md py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
                mode === 'signup' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Sign up
            </button>
          </div>

          {error && <p className="text-sm text-red-400 text-center">{error}</p>}

          <form onSubmit={e => void onEmailSubmit(e)} className="space-y-3">
            <div>
              <label htmlFor="auth-email" className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={inputClass}
                placeholder="you@example.com"
                disabled={busy}
              />
            </div>
            <div>
              <label htmlFor="auth-password" className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={inputClass}
                placeholder="••••••••"
                disabled={busy}
              />
            </div>
            {mode === 'signup' && (
              <div>
                <label
                  htmlFor="auth-confirm"
                  className="text-xs font-medium uppercase tracking-wider text-zinc-500"
                >
                  Confirm password
                </label>
                <input
                  id="auth-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className={inputClass}
                  placeholder="••••••••"
                  disabled={busy}
                />
              </div>
            )}
            <Button
              type="submit"
              className="w-full min-h-12 bg-red-600 text-white hover:bg-red-700 font-bold uppercase tracking-widest text-xs"
              disabled={busy}
            >
              {loading === 'email'
                ? mode === 'signup'
                  ? 'Creating account…'
                  : 'Signing in…'
                : mode === 'signup'
                  ? 'Create account'
                  : 'Sign in with email'}
            </Button>
          </form>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-800" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">or</span>
            <div className="h-px flex-1 bg-zinc-800" />
          </div>

          <Button
            type="button"
            className="w-full min-h-12 bg-white text-black hover:bg-zinc-200 font-bold uppercase tracking-widest text-xs"
            onClick={() => void onGoogle()}
            disabled={busy}
          >
            {loading === 'google' ? 'Signing in…' : 'Continue with Google'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
