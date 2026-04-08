import React, {useCallback, useEffect, useRef, useState} from 'react';
import type {User} from 'firebase/auth';
import {X, Loader2, UserRound, Camera, Trash2, KeyRound, Mail, MapPin} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {motion} from 'motion/react';
import {
  changePasswordWithCurrent,
  clearUserProfilePhoto,
  formatAuthError,
  saveUserDisplayName,
  sendPasswordResetToEmail,
  uploadUserProfilePhoto,
  userHasPasswordProvider,
} from '@/src/lib/auth';
import {syncOwnerDisplayNameOnMyClips} from '@/src/lib/clips';
import {doc, getDoc} from 'firebase/firestore';
import {getFirebaseDb} from '@/src/lib/firebase';
import {syncCurrentUserProfileDoc, updateUserProfileCity} from '@/src/lib/userProfile';

const inputClass =
  'w-full min-h-11 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-600/50';

interface ProfilePanelProps {
  user: User;
  onClose: () => void;
}

export function ProfilePanel({user, onClose}: ProfilePanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState('');
  const [city, setCity] = useState('');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [removePhotoBusy, setRemovePhotoBusy] = useState(false);
  const [saveNameBusy, setSaveNameBusy] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordOk, setPasswordOk] = useState(false);

  const [resetBusy, setResetBusy] = useState(false);
  const [resetHint, setResetHint] = useState<string | null>(null);

  const hasPassword = userHasPasswordProvider(user);
  const email = user.email ?? '';

  useEffect(() => {
    setDisplayName(user.displayName ?? '');
    setCity('');
    setProfileError(null);
    setProfileSaved(false);
    setPasswordError(null);
    setPasswordOk(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setResetHint(null);
  }, [user.uid]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const snap = await getDoc(doc(getFirebaseDb(), 'users', user.uid));
      if (cancelled) return;
      const c = snap.data()?.city;
      setCity(typeof c === 'string' ? c : '');
    })();
    return () => {
      cancelled = true;
    };
  }, [user.uid]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (!profileSaved) return;
    const t = window.setTimeout(() => setProfileSaved(false), 2500);
    return () => window.clearTimeout(t);
  }, [profileSaved]);

  useEffect(() => {
    if (!resetHint) return;
    const t = window.setTimeout(() => setResetHint(null), 4000);
    return () => window.clearTimeout(t);
  }, [resetHint]);

  useEffect(() => {
    if (!passwordOk) return;
    const t = window.setTimeout(() => setPasswordOk(false), 2500);
    return () => window.clearTimeout(t);
  }, [passwordOk]);

  const onPhotoPick = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      setProfileError(null);
      setPhotoBusy(true);
      try {
        await uploadUserProfilePhoto(user, file);
        await syncCurrentUserProfileDoc();
      } catch (err) {
        setProfileError(err instanceof Error ? err.message : formatAuthError(err));
      } finally {
        setPhotoBusy(false);
      }
    },
    [user],
  );

  const onRemovePhoto = useCallback(async () => {
    if (!user.photoURL) return;
    setProfileError(null);
    setRemovePhotoBusy(true);
    try {
      await clearUserProfilePhoto(user);
      await syncCurrentUserProfileDoc();
    } catch (err) {
      setProfileError(formatAuthError(err));
    } finally {
      setRemovePhotoBusy(false);
    }
  }, [user]);

  const onSaveProfile = useCallback(async () => {
    setProfileError(null);
    setSaveNameBusy(true);
    try {
      await saveUserDisplayName(user, displayName);
      await syncCurrentUserProfileDoc();
      await updateUserProfileCity(user.uid, city);
      const label = displayName.trim() || user.email || 'Player';
      await syncOwnerDisplayNameOnMyClips(user.uid, label);
      setProfileSaved(true);
    } catch (err) {
      setProfileError(formatAuthError(err));
    } finally {
      setSaveNameBusy(false);
    }
  }, [user, displayName, city]);

  const onChangePassword = useCallback(async () => {
    setPasswordError(null);
    if (!email) {
      setPasswordError('No email on this account — password change is unavailable.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    setPasswordBusy(true);
    try {
      await changePasswordWithCurrent(user, email, currentPassword, newPassword);
      setPasswordOk(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(formatAuthError(err, 'passwordChange'));
    } finally {
      setPasswordBusy(false);
    }
  }, [user, email, currentPassword, newPassword, confirmPassword]);

  const onSendReset = useCallback(async () => {
    if (!email) return;
    setResetHint(null);
    setResetBusy(true);
    try {
      await sendPasswordResetToEmail(email);
      setResetHint('Check your inbox for a reset link.');
    } catch (err) {
      setResetHint(formatAuthError(err));
    } finally {
      setResetBusy(false);
    }
  }, [email]);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-panel-title"
      initial={{opacity: 0}}
      animate={{opacity: 1}}
      exit={{opacity: 0}}
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto overscroll-contain bg-black/90 p-3 sm:p-4 backdrop-blur-md pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]"
      onClick={onClose}
    >
      <Card
        className="my-auto w-full max-w-lg gap-0 py-0 flex flex-col bg-zinc-950 border-zinc-800 text-white overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-zinc-800 p-3 sm:p-4 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Badge className="shrink-0 bg-red-600 text-[10px] font-bold uppercase tracking-wider">
              Account
            </Badge>
            <CardTitle
              id="profile-panel-title"
              className="text-base sm:text-lg font-bold tracking-tight truncate"
            >
              Your profile
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="shrink-0 min-h-11 min-w-11 text-zinc-400 hover:text-white"
            aria-label="Close profile"
          >
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>

        <CardContent className="flex flex-col gap-6 p-4 sm:p-5 overflow-y-auto max-h-[calc(100dvh-6rem)]">
          {profileError && (
            <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-300">
              {profileError}
            </div>
          )}
          {profileSaved && (
            <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-300">
              Profile saved.
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
            <div className="relative h-24 w-24 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden shrink-0">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt=""
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <UserRound className="h-10 w-10 text-zinc-600" />
                </div>
              )}
              {photoBusy && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-red-500 animate-spin" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 w-full sm:flex-1">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={onPhotoPick}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-zinc-700 min-h-11"
                  disabled={photoBusy || removePhotoBusy}
                  onClick={() => fileRef.current?.click()}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Change photo
                </Button>
                {user.photoURL && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-zinc-400 hover:text-red-400 min-h-11"
                    disabled={photoBusy || removePhotoBusy}
                    onClick={() => void onRemovePhoto()}
                  >
                    {removePhotoBusy ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-zinc-500">JPEG, PNG, or WebP — up to 2 MB.</p>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="profile-display-name" className="text-xs font-bold uppercase tracking-widest text-zinc-500">
              Display name
            </label>
            <input
              id="profile-display-name"
              type="text"
              autoComplete="name"
              className={inputClass}
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="How you appear in the app"
            />
            <div className="space-y-2 mt-4">
              <label htmlFor="profile-city" className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                City
              </label>
              <input
                id="profile-city"
                type="text"
                autoComplete="address-level2"
                className={inputClass}
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="e.g. Atlanta"
                maxLength={120}
              />
            </div>
            <Button
              type="button"
              className="mt-3 bg-red-600 hover:bg-red-700 min-h-11 inline-flex items-center justify-center gap-2"
              disabled={saveNameBusy}
              onClick={() => void onSaveProfile()}
            >
              {saveNameBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
              Save profile
            </Button>
          </div>

          <div className="space-y-2 border-t border-zinc-800 pt-6">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
              <Mail className="h-3.5 w-3.5" />
              Email
            </div>
            <p className="text-sm text-zinc-300 break-all">{email || 'Not available'}</p>
            <p className="text-xs text-zinc-500">
              Email sign-in address cannot be changed here. Use your provider’s account settings if needed.
            </p>
            <p className="text-xs text-zinc-600">
              A read-only copy of your name, email, city, and photo is kept in Firestore under{' '}
              <span className="font-mono text-zinc-500">users</span> / your account id (for admins and the console).
            </p>
          </div>

          {hasPassword && email && (
            <div className="space-y-4 border-t border-zinc-800 pt-6">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
                <KeyRound className="h-3.5 w-3.5" />
                Password
              </div>
              {passwordError && (
                <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-300">
                  {passwordError}
                </div>
              )}
              {passwordOk && (
                <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-300">
                  Password updated.
                </div>
              )}
              <input
                type="password"
                autoComplete="current-password"
                className={inputClass}
                placeholder="Current password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
              />
              <input
                type="password"
                autoComplete="new-password"
                className={inputClass}
                placeholder="New password (min. 6 characters)"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
              <input
                type="password"
                autoComplete="new-password"
                className={inputClass}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                className="border-zinc-700 w-full sm:w-auto min-h-11"
                disabled={passwordBusy}
                onClick={() => void onChangePassword()}
              >
                {passwordBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Update password
              </Button>
              <div className="pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-zinc-400 hover:text-white min-h-11 px-0"
                  disabled={resetBusy}
                  onClick={() => void onSendReset()}
                >
                  {resetBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Send password reset email
                </Button>
                {resetHint && <p className="text-sm text-zinc-400 mt-2">{resetHint}</p>}
              </div>
            </div>
          )}

          {!hasPassword && (
            <p className="text-sm text-zinc-500 border-t border-zinc-800 pt-6">
              You signed in with Google. Name and photo can be updated above; for Google-linked details, use your
              Google account.
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
