import React, {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {signInWithGoogle} from '@/src/lib/auth';
import {isFirebaseConfigured} from '@/src/lib/firebase';

export function SignInScreen() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const configured = isFirebaseConfigured();

  const onGoogle = async () => {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  };

  if (!configured) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6 bg-black text-white safe-pad-bottom">
        <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="font-display uppercase tracking-tight">Firebase setup</CardTitle>
            <CardDescription className="text-zinc-400">
              Add your web app config to <code className="text-orange-400">.env.local</code> using{' '}
              <code className="text-orange-400">.env.example</code> as a template, then restart the dev
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
          <div className="h-14 w-14 rounded-full bg-orange-600 flex items-center justify-center">
            <span className="text-lg font-black">NB</span>
          </div>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-black uppercase tracking-tight italic">
          PlayCenter
        </h1>
        <p className="text-zinc-400 text-sm leading-relaxed">
          Own your game. Sign in to record up to 60s clips and organize runs, highlights, and training
          in your private library.
        </p>
      </div>

      <Card className="w-full max-w-sm bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6 space-y-4">
          {error && <p className="text-sm text-red-400 text-center">{error}</p>}
          <Button
            className="w-full min-h-12 bg-white text-black hover:bg-zinc-200 font-bold uppercase tracking-widest text-xs"
            onClick={() => void onGoogle()}
            disabled={busy}
          >
            {busy ? 'Signing in…' : 'Continue with Google'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
