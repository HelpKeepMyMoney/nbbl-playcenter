import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Loader2, Pencil, Shield, Trash2, Users} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {subscribeToAdminUids} from '@/src/lib/admin';
import {deleteUserAccountCallable, setUserAdminRoleCallable} from '@/src/lib/adminCallable';
import {
  adminUpdateUserProfileFirestore,
  type AdminUserListRow,
  subscribeToUsersForAdmin,
} from '@/src/lib/userProfile';

interface AdminUsersTabProps {
  moderatorUid: string;
}

function UsersTabHelp() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open]);

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-600 text-sm font-semibold text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-red-600/50"
        aria-expanded={open}
        aria-controls="users-tab-help"
        id="users-tab-help-trigger"
        title="How this tab works"
      >
        <span className="sr-only">How this tab works</span>?
      </button>
      {open ? (
        <div
          id="users-tab-help"
          role="region"
          aria-labelledby="users-tab-help-trigger"
          className="absolute right-0 top-full z-[70] mt-1.5 w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-xs leading-relaxed text-zinc-400 shadow-xl"
        >
          <p className="flex items-start gap-2">
            <Users className="h-4 w-4 shrink-0 mt-0.5 text-zinc-500" />
            <span>
              Up to 500 Firestore <code className="text-zinc-300">users</code> profiles (sorted by last update).{' '}
              <span className="text-zinc-300">Role</span> (User / Admin) is on each row and in the edit panel.
              Profile editing only changes the Firestore mirror, not Auth. Delete account runs a Cloud Function that
              removes Auth, profile, clips, and Storage for that user (requires{' '}
              <code className="text-zinc-300">deleteUserAccount</code> /{' '}
              <code className="text-zinc-300">setUserAdminRole</code> deployed — Blaze plan). Deploy updated{' '}
              <code className="text-zinc-300">firestore.rules</code> so admins can list{' '}
              <code className="text-zinc-300">admins</code> for role labels.
            </span>
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function AdminUsersTab({moderatorUid}: AdminUsersTabProps) {
  const [users, setUsers] = useState<AdminUserListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [editing, setEditing] = useState<AdminUserListRow | null>(null);
  const [form, setForm] = useState({
    displayName: '',
    email: '',
    photoURL: '',
    city: '',
    role: 'user' as 'user' | 'admin',
  });
  const [adminUids, setAdminUids] = useState<Set<string>>(() => new Set());
  const [saveBusy, setSaveBusy] = useState(false);
  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [roleBusyUid, setRoleBusyUid] = useState<string | null>(null);
  /** Remount row role select when user cancels demote confirm so UI snaps back. */
  const [roleSelectKick, setRoleSelectKick] = useState<Record<string, number>>({});

  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsub = subscribeToUsersForAdmin(
      next => {
        setUsers(next);
        setLoading(false);
        setError(null);
      },
      err => {
        setError(err.message);
        setLoading(false);
      },
    );
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = subscribeToAdminUids(
      next => {
        setAdminUids(prev => {
          if (prev.size === next.size && [...next].every(id => prev.has(id))) return prev;
          return next;
        });
      },
      err => setError(err.message),
    );
    return unsub;
  }, []);

  useEffect(() => {
    const valid = new Set(users.map(u => u.uid));
    setSelectedIds(prev => {
      const next = new Set<string>();
      for (const id of prev) {
        if (valid.has(id)) next.add(id);
      }
      if (next.size === prev.size && [...prev].every(id => next.has(id))) return prev;
      return next;
    });
  }, [users]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      u =>
        u.uid.toLowerCase().includes(q) ||
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.city.toLowerCase().includes(q),
    );
  }, [users, search]);

  const selectedCount = selectedIds.size;
  const allVisibleSelected =
    filtered.length > 0 && filtered.every(u => selectedIds.has(u.uid));
  const anyBusy = saveBusy || bulkBusy || deleteBusyId !== null || roleBusyUid !== null;

  const bumpRoleSelect = useCallback((uid: string) => {
    setRoleSelectKick(k => ({...k, [uid]: (k[uid] ?? 0) + 1}));
  }, []);

  const changeRoleFromRow = useCallback(
    async (u: AdminUserListRow, next: 'admin' | 'user') => {
      if (u.uid === moderatorUid) return;
      const wasAdmin = adminUids.has(u.uid);
      const curr: 'admin' | 'user' = wasAdmin ? 'admin' : 'user';
      if (next === curr) return;
      if (next === 'user') {
        const label = u.displayName.trim() || u.email || u.uid.slice(0, 8);
        if (!window.confirm(`Remove admin role from “${label}”? They will lose moderator access after refresh.`)) {
          bumpRoleSelect(u.uid);
          return;
        }
      }
      setRoleBusyUid(u.uid);
      setError(null);
      try {
        await setUserAdminRoleCallable(u.uid, next);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Role update failed');
        bumpRoleSelect(u.uid);
      } finally {
        setRoleBusyUid(null);
      }
    },
    [moderatorUid, adminUids, bumpRoleSelect],
  );

  const toggleSelect = useCallback((uid: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }, []);

  const toggleSelectAllVisible = useCallback(() => {
    setSelectedIds(prev => {
      if (filtered.length === 0) return prev;
      if (filtered.every(u => prev.has(u.uid))) return new Set();
      return new Set(filtered.map(u => u.uid));
    });
  }, [filtered]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const openEdit = useCallback((u: AdminUserListRow) => {
    setEditing(u);
    setForm({
      displayName: u.displayName,
      email: u.email,
      photoURL: u.photoURL ?? '',
      city: u.city,
      role: adminUids.has(u.uid) ? 'admin' : 'user',
    });
    setError(null);
  }, [adminUids]);

  const closeEdit = useCallback(() => {
    setEditing(null);
    setForm({displayName: '', email: '', photoURL: '', city: '', role: 'user'});
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editing) return;
    setSaveBusy(true);
    setError(null);
    try {
      await adminUpdateUserProfileFirestore(editing.uid, {
        displayName: form.displayName,
        email: form.email,
        photoURL: form.photoURL.trim() === '' ? null : form.photoURL,
        city: form.city,
      });
      if (editing.uid !== moderatorUid) {
        const wasAdmin = adminUids.has(editing.uid);
        const wantsAdmin = form.role === 'admin';
        if (wantsAdmin !== wasAdmin) {
          await setUserAdminRoleCallable(editing.uid, wantsAdmin ? 'admin' : 'user');
        }
      }
      closeEdit();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaveBusy(false);
    }
  }, [editing, form, closeEdit, adminUids, moderatorUid]);

  const removeOne = useCallback(
    async (u: AdminUserListRow) => {
      if (u.uid === moderatorUid) {
        setError('You cannot delete your own account while signed in as this user.');
        return;
      }
      const label = u.displayName.trim() || u.email || u.uid.slice(0, 8);
      if (
        !window.confirm(
          `Permanently delete account for “${label}”?\n\nThis removes their Firebase login, Firestore profile, all clips (video + thumbnails + likes), profile images, and admin flag if any. This cannot be undone.`,
        )
      ) {
        return;
      }
      setDeleteBusyId(u.uid);
      setError(null);
      try {
        await deleteUserAccountCallable(u.uid);
        setSelectedIds(prev => {
          const next = new Set(prev);
          next.delete(u.uid);
          return next;
        });
        if (editing?.uid === u.uid) closeEdit();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Delete failed');
      } finally {
        setDeleteBusyId(null);
      }
    },
    [moderatorUid, editing, closeEdit],
  );

  const bulkDelete = useCallback(async () => {
    const targets = filtered.filter(u => selectedIds.has(u.uid) && u.uid !== moderatorUid);
    const skippedSelf = filtered.some(u => selectedIds.has(u.uid) && u.uid === moderatorUid);
    if (targets.length === 0) {
      setError(
        skippedSelf
          ? 'Cannot delete your own profile. Deselect your account or choose other users.'
          : 'No users selected.',
      );
      return;
    }
    if (
      !window.confirm(
        `Permanently delete ${targets.length} full account(s)? Each user’s Auth login, profile, clips, and Storage files will be removed. This cannot be undone.`,
      )
    ) {
      return;
    }
    setBulkBusy(true);
    setError(null);
    try {
      for (const u of targets) {
        await deleteUserAccountCallable(u.uid);
      }
      setSelectedIds(new Set());
      if (editing && targets.some(t => t.uid === editing.uid)) closeEdit();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bulk delete failed');
    } finally {
      setBulkBusy(false);
    }
  }, [filtered, selectedIds, moderatorUid, editing, closeEdit]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <input
          type="search"
          className="min-h-11 min-w-0 flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-600/50"
          placeholder="Search by name, email, city, or uid…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Filter users"
        />
        <UsersTabHelp />
      </div>

      {error && (
        <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-zinc-600 text-red-600 focus:ring-red-600 shrink-0"
                checked={allVisibleSelected}
                disabled={anyBusy}
                onChange={() => toggleSelectAllVisible()}
              />
              Select all in view
            </label>
            <span className="text-xs text-zinc-500">
              {selectedCount} selected
              {search.trim() ? ` · ${filtered.length} shown` : ''}
            </span>
            {selectedCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-zinc-500"
                disabled={anyBusy}
                onClick={clearSelection}
              >
                Clear selection
              </Button>
            )}
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-fit border-red-950/80 bg-red-950/20 text-red-300 hover:bg-red-950/40"
            disabled={anyBusy || selectedCount === 0}
            onClick={() => void bulkDelete()}
          >
            {bulkBusy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
            Bulk delete accounts
            {selectedCount > 0 ? ` (${selectedCount})` : ''}
          </Button>
        </div>
      )}

      <div className="space-y-2 pr-1">
        {loading && <p className="text-sm text-zinc-500 py-8 text-center">Loading users…</p>}
        {!loading && filtered.length === 0 && (
          <p className="text-sm text-zinc-500 py-8 text-center">
            {users.length === 0 ? 'No user profiles yet.' : 'No matches for this search.'}
          </p>
        )}
        {!loading &&
          filtered.map(u => (
            <div
              key={u.uid}
              className="flex flex-wrap items-start gap-3 p-3 rounded-lg border border-zinc-800 bg-zinc-900/50"
            >
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-zinc-600 text-red-600 focus:ring-red-600 shrink-0 mt-1"
                checked={selectedIds.has(u.uid)}
                disabled={anyBusy}
                onChange={() => toggleSelect(u.uid)}
                aria-label={`Select user ${u.displayName || u.uid}`}
              />
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-white truncate">{u.displayName.trim() || '—'}</p>
                  {u.uid === moderatorUid ? (
                    <Badge variant="outline" className="text-[10px] border-amber-700 text-amber-400">
                      You
                    </Badge>
                  ) : null}
                  {adminUids.has(u.uid) ? (
                    <Badge variant="outline" className="text-[10px] border-yellow-700 text-yellow-400">
                      Admin
                    </Badge>
                  ) : null}
                </div>
                <p className="text-xs text-zinc-500 truncate">{u.email || '—'}</p>
                <p className="text-xs text-zinc-500">{u.city.trim() ? u.city : '— city'}</p>
                <p className="text-[10px] font-mono text-zinc-600 break-all">{u.uid}</p>
                <p className="text-[10px] text-zinc-600">
                  Updated {u.updatedAt ? u.updatedAt.toLocaleString() : '—'}
                </p>
              </div>
              <div className="flex flex-col gap-2 shrink-0 items-stretch sm:items-end">
                <label className="flex flex-col gap-1 min-w-[7.5rem]">
                  <span className="text-[10px] uppercase tracking-wide text-zinc-500 flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    Role
                  </span>
                  <select
                    key={`${u.uid}-${roleSelectKick[u.uid] ?? 0}-${adminUids.has(u.uid) ? '1' : '0'}`}
                    className="min-h-9 bg-zinc-950 border border-zinc-700 rounded-md px-2 py-1.5 text-xs text-white"
                    value={adminUids.has(u.uid) ? 'admin' : 'user'}
                    disabled={anyBusy || u.uid === moderatorUid}
                    onChange={e =>
                      void changeRoleFromRow(u, e.target.value === 'admin' ? 'admin' : 'user')
                    }
                    aria-label={`Role for ${u.displayName || u.uid}`}
                    title={u.uid === moderatorUid ? 'Cannot change your own role here' : undefined}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                  {roleBusyUid === u.uid ? (
                    <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                      Updating…
                    </span>
                  ) : null}
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-zinc-600"
                  disabled={anyBusy}
                  onClick={() => openEdit(u)}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit profile
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-red-950/80 bg-red-950/20 text-red-300"
                  disabled={anyBusy || u.uid === moderatorUid}
                  onClick={() => void removeOne(u)}
                  title={u.uid === moderatorUid ? 'Cannot delete your own account' : undefined}
                >
                  {deleteBusyId === u.uid ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-1" />
                  )}
                  Delete account
                </Button>
              </div>
            </div>
          ))}
      </div>

      {editing && (
        <div className="border-t border-zinc-800 p-4 bg-zinc-900/80 space-y-3 shrink-0 rounded-b-xl scroll-mt-4">
          <p className="text-sm font-medium text-zinc-300">Edit profile · {editing.uid}</p>
            <label className="space-y-1 block max-w-md">
              <span className="text-xs text-zinc-500 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-yellow-500/90" />
                Role
              </span>
              <select
                className="w-full min-h-10 bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white"
                value={editing.uid === moderatorUid ? 'admin' : form.role}
                disabled={editing.uid === moderatorUid}
                onChange={e =>
                  setForm(f => ({...f, role: e.target.value === 'admin' ? 'admin' : 'user'}))
                }
                aria-label="User role"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
              {editing.uid === moderatorUid ? (
                <p className="text-[10px] text-zinc-500">
                  You cannot remove your own admin role from this panel (use the console or another admin).
                </p>
              ) : (
                <p className="text-[10px] text-zinc-500">
                  Applied with Save. For instant updates you can also use the row Role menu. Users may need to sign
                  out and back in for Storage tokens.
                </p>
              )}
            </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Display name</span>
              <input
                className="w-full min-h-10 bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white"
                value={form.displayName}
                onChange={e => setForm(f => ({...f, displayName: e.target.value}))}
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Email (Firestore mirror)</span>
              <input
                className="w-full min-h-10 bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white"
                value={form.email}
                onChange={e => setForm(f => ({...f, email: e.target.value}))}
              />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs text-zinc-500">Photo URL</span>
              <input
                className="w-full min-h-10 bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white"
                value={form.photoURL}
                onChange={e => setForm(f => ({...f, photoURL: e.target.value}))}
                placeholder="https://…"
              />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs text-zinc-500">City</span>
              <input
                className="w-full min-h-10 bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white"
                value={form.city}
                onChange={e => setForm(f => ({...f, city: e.target.value}))}
              />
            </label>
          </div>
          <div className="flex gap-2 justify-end flex-wrap">
            <Button type="button" variant="ghost" disabled={saveBusy} onClick={closeEdit}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700"
              disabled={saveBusy}
              onClick={() => void saveEdit()}
            >
              {saveBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save changes'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
