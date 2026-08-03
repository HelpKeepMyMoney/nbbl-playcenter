import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {X, Loader2, Check, XCircle, Shield, Trash2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {motion} from 'motion/react';
import type {VideoMetadata} from '@/src/types';
import {clipIsPublishedToCommunity} from '@/src/types';
import {
  deleteClip,
  migrateLegacyPublicClips,
  moderateClipByAdmin,
  type ModerationFilter,
  subscribeToClipsForModeration,
} from '@/src/lib/clips';
import {fetchUserProfilesByIds, type UserProfilePublic} from '@/src/lib/userProfile';
import {AdminUsersTab} from './AdminUsersTab';

const filterTabs: {id: ModerationFilter; label: string}[] = [
  {id: 'pending', label: 'Pending'},
  {id: 'published', label: 'Live'},
  {id: 'rejected', label: 'Denied'},
  {id: 'private', label: 'Private'},
  {id: 'all', label: 'All'},
];

interface AdminPanelProps {
  moderatorUid: string;
  onClose: () => void;
}

export function AdminPanel({moderatorUid, onClose}: AdminPanelProps) {
  const [filter, setFilter] = useState<ModerationFilter>('pending');
  const [clips, setClips] = useState<VideoMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [denyId, setDenyId] = useState<string | null>(null);
  const [denyReason, setDenyReason] = useState('');
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null);
  const [migrateBusy, setMigrateBusy] = useState(false);
  const [migrateHint, setMigrateHint] = useState<string | null>(null);
  const [profilesByUid, setProfilesByUid] = useState<Record<string, UserProfilePublic>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkBusy, setBulkBusy] = useState<null | 'approve' | 'deny' | 'delete'>(null);
  const [bulkDenyOpen, setBulkDenyOpen] = useState(false);
  const [adminSection, setAdminSection] = useState<'clips' | 'users'>('clips');

  const selectedCount = selectedIds.size;
  const allVisibleSelected =
    clips.length > 0 && clips.every(c => selectedIds.has(c.id));
  const anyBusy = bulkBusy !== null;

  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsub = subscribeToClipsForModeration(
      filter,
      next => {
        setClips(next);
        setLoading(false);
        setError(null);
      },
      err => {
        setError(err.message);
        setLoading(false);
      },
    );
    return unsub;
  }, [filter]);

  useEffect(() => {
    const valid = new Set(clips.map(c => c.id));
    setSelectedIds(prev => {
      const next = new Set<string>();
      for (const id of prev) {
        if (valid.has(id)) next.add(id);
      }
      if (next.size === prev.size && [...prev].every(id => next.has(id))) return prev;
      return next;
    });
  }, [clips]);

  useEffect(() => {
    const uids: string[] = [
      ...new Set((clips as VideoMetadata[]).map(c => c.ownerUserId)),
    ];
    if (uids.length === 0) {
      setProfilesByUid({});
      return;
    }
    let cancelled = false;
    void fetchUserProfilesByIds(uids).then(map => {
      if (cancelled) return;
      const next: Record<string, UserProfilePublic> = {};
      map.forEach((v, k) => {
        next[k] = v;
      });
      setProfilesByUid(next);
    });
    return () => {
      cancelled = true;
    };
  }, [clips]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const approve = useCallback(
    async (clipId: string) => {
      setActionBusy(clipId);
      try {
        await moderateClipByAdmin(clipId, 'published', '', moderatorUid);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Approve failed');
      } finally {
        setActionBusy(null);
      }
    },
    [moderatorUid],
  );

  const openDeny = useCallback((clipId: string) => {
    setBulkDenyOpen(false);
    setDenyId(clipId);
    setDenyReason('');
  }, []);

  const toggleSelect = useCallback((clipId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(clipId)) next.delete(clipId);
      else next.add(clipId);
      return next;
    });
  }, []);

  const toggleSelectAllVisible = useCallback(() => {
    setSelectedIds(prev => {
      if (clips.length === 0) return prev;
      if (clips.every(c => prev.has(c.id))) {
        return new Set();
      }
      return new Set(clips.map(c => c.id));
    });
  }, [clips]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const openBulkDeny = useCallback(() => {
    if (selectedCount === 0) return;
    setDenyId(null);
    setBulkDenyOpen(true);
    setDenyReason('');
  }, [selectedCount]);

  /** Pending or denied clips can be approved (published to Content Hub). */
  const approvableSelectedCount = useMemo(
    () =>
      clips.filter(
        c =>
          selectedIds.has(c.id) &&
          (c.communityVisibility === 'pending' || c.communityVisibility === 'rejected'),
      ).length,
    [clips, selectedIds],
  );

  const bulkApprove = useCallback(async () => {
    const targets = clips.filter(
      c =>
        selectedIds.has(c.id) &&
        (c.communityVisibility === 'pending' || c.communityVisibility === 'rejected'),
    );
    if (targets.length === 0) {
      setError('No pending or denied clips in the current selection.');
      return;
    }
    if (
      !window.confirm(
        `Approve ${targets.length} clip(s) for the Content Hub? (Denied clips will be cleared and published.)`,
      )
    ) {
      return;
    }
    setBulkBusy('approve');
    setError(null);
    try {
      for (const c of targets) {
        await moderateClipByAdmin(c.id, 'published', '', moderatorUid);
      }
      setSelectedIds(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bulk approve failed');
    } finally {
      setBulkBusy(null);
    }
  }, [clips, moderatorUid, selectedIds]);

  const submitBulkDeny = useCallback(async () => {
    if (!bulkDenyOpen) return;
    const trimmed = denyReason.trim();
    if (!trimmed) {
      setError('Enter a reason when denying clips.');
      return;
    }
    const targets = clips.filter(c => selectedIds.has(c.id));
    if (targets.length === 0) return;
    setBulkBusy('deny');
    setError(null);
    try {
      for (const c of targets) {
        await moderateClipByAdmin(c.id, 'rejected', trimmed, moderatorUid);
      }
      setBulkDenyOpen(false);
      setDenyReason('');
      setSelectedIds(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bulk deny failed');
    } finally {
      setBulkBusy(null);
    }
  }, [bulkDenyOpen, clips, denyReason, moderatorUid, selectedIds]);

  const bulkDelete = useCallback(async () => {
    const targets = clips.filter(c => selectedIds.has(c.id));
    if (targets.length === 0) return;
    if (
      !window.confirm(
        `Permanently delete ${targets.length} clip(s)? Videos, thumbnails, likes, and Firestore records will be removed.`,
      )
    ) {
      return;
    }
    setBulkBusy('delete');
    setError(null);
    try {
      for (const v of targets) {
        await deleteClip(v.ownerUserId, v);
      }
      setSelectedIds(new Set());
      setDenyId(current => (current && targets.some(t => t.id === current) ? null : current));
      setBulkDenyOpen(false);
      setDenyReason('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bulk delete failed');
    } finally {
      setBulkBusy(null);
    }
  }, [clips, selectedIds]);

  const submitDeny = useCallback(async () => {
    if (!denyId) return;
    setActionBusy(denyId);
    setError(null);
    try {
      await moderateClipByAdmin(denyId, 'rejected', denyReason, moderatorUid);
      setDenyId(null);
      setDenyReason('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Deny failed');
    } finally {
      setActionBusy(null);
    }
  }, [denyId, denyReason, moderatorUid]);

  const runMigrate = useCallback(async () => {
    setMigrateBusy(true);
    setMigrateHint(null);
    setError(null);
    try {
      const n = await migrateLegacyPublicClips();
      setMigrateHint(n === 0 ? 'No legacy clips needed migration.' : `Updated ${n} clip(s).`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Migration failed');
    } finally {
      setMigrateBusy(false);
    }
  }, []);

  const removeClip = useCallback(async (v: VideoMetadata) => {
    const label = v.title.length > 72 ? `${v.title.slice(0, 72)}…` : v.title;
    if (
      !window.confirm(
        `Delete “${label}” permanently? Video, thumbnail, likes, and Firestore record will be removed.`,
      )
    ) {
      return;
    }
    setDeleteBusyId(v.id);
    setError(null);
    try {
      await deleteClip(v.ownerUserId, v);
      if (denyId === v.id) {
        setDenyId(null);
        setDenyReason('');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeleteBusyId(null);
    }
  }, [denyId]);

  const rowBusy = (id: string) => anyBusy || actionBusy === id || deleteBusyId === id;

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-panel-title"
      initial={{opacity: 0}}
      animate={{opacity: 1}}
      exit={{opacity: 0}}
      className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center overflow-y-auto overscroll-contain bg-black/95 p-3 sm:p-4 backdrop-blur-md pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]"
      onClick={onClose}
    >
      <Card
        className="my-auto w-full max-w-4xl gap-0 py-0 flex flex-col bg-zinc-950 border-zinc-800 text-white overflow-hidden shadow-2xl max-h-[calc(100dvh-2rem)]"
        onClick={e => e.stopPropagation()}
      >
        <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-zinc-800 p-3 sm:p-4 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Badge className="shrink-0 bg-amber-700 text-[10px] font-bold uppercase tracking-wider gap-1">
              <Shield className="h-3 w-3" />
              Admin
            </Badge>
            <CardTitle id="admin-panel-title" className="text-base sm:text-lg font-bold truncate">
              {adminSection === 'clips' ? 'Clip moderation' : 'User profiles'}
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="shrink-0 min-h-11 min-w-11 text-zinc-400 hover:text-white"
            aria-label="Close admin"
          >
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>

        <div className="flex border-b border-zinc-800 px-4 gap-1 shrink-0">
          <button
            type="button"
            className={`px-3 py-2 text-xs font-bold uppercase tracking-widest rounded-t-md border-b-2 -mb-px transition-colors ${
              adminSection === 'clips'
                ? 'border-red-600 text-white bg-zinc-900/50'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
            onClick={() => setAdminSection('clips')}
          >
            Clips
          </button>
          <button
            type="button"
            className={`px-3 py-2 text-xs font-bold uppercase tracking-widest rounded-t-md border-b-2 -mb-px transition-colors ${
              adminSection === 'users'
                ? 'border-red-600 text-white bg-zinc-900/50'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
            onClick={() => {
              setAdminSection('users');
              setDenyId(null);
              setBulkDenyOpen(false);
              setDenyReason('');
            }}
          >
            Users
          </button>
        </div>

        <CardContent
          className={`flex flex-col gap-4 p-4 min-h-0 flex-1 ${
            adminSection === 'users' ? 'overflow-y-auto' : 'overflow-hidden'
          }`}
        >
          {adminSection === 'users' ? (
            <AdminUsersTab moderatorUid={moderatorUid} />
          ) : (
            <>
          <div className="flex flex-wrap gap-2 items-center">
            {filterTabs.map(t => (
              <Button
                key={t.id}
                type="button"
                size="sm"
                variant={filter === t.id ? 'default' : 'outline'}
                onClick={() => setFilter(t.id)}
                className={
                  filter === t.id
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'border-zinc-700 text-zinc-400'
                }
              >
                {t.label}
              </Button>
            ))}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-zinc-500 ml-auto"
              disabled={migrateBusy}
              onClick={() => void runMigrate()}
            >
              {migrateBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Migrate legacy public
            </Button>
          </div>
          {migrateHint && <p className="text-xs text-zinc-400">{migrateHint}</p>}
          {error && (
            <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          {!loading && clips.length > 0 && (
            <div className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-3">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-zinc-600 text-red-600 focus:ring-red-600 shrink-0"
                    checked={allVisibleSelected}
                    disabled={anyBusy || migrateBusy}
                    onChange={() => toggleSelectAllVisible()}
                  />
                  Select all on page
                </label>
                <span className="text-xs text-zinc-500">
                  {selectedCount} of {clips.length} selected
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
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="bg-emerald-700 hover:bg-emerald-600"
                  disabled={anyBusy || migrateBusy || approvableSelectedCount === 0}
                  onClick={() => void bulkApprove()}
                >
                  {bulkBusy === 'approve' ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Check className="h-4 w-4 mr-1" />
                  )}
                  Bulk approve{approvableSelectedCount > 0 ? ` (${approvableSelectedCount})` : ''}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-red-900/60 text-red-300"
                  disabled={anyBusy || migrateBusy || selectedCount === 0}
                  onClick={openBulkDeny}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Bulk deny{selectedCount > 0 ? ` (${selectedCount})` : ''}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-red-950/80 bg-red-950/20 text-red-300 hover:bg-red-950/40"
                  disabled={anyBusy || migrateBusy || selectedCount === 0}
                  onClick={() => void bulkDelete()}
                >
                  {bulkBusy === 'delete' ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-1" />
                  )}
                  Bulk delete{selectedCount > 0 ? ` (${selectedCount})` : ''}
                </Button>
              </div>
            </div>
          )}

          <div className="overflow-y-auto flex-1 min-h-[12rem] space-y-3 pr-1">
            {loading && <p className="text-sm text-zinc-500 py-8 text-center">Loading…</p>}
            {!loading && clips.length === 0 && (
              <p className="text-sm text-zinc-500 py-8 text-center">No clips in this filter.</p>
            )}
            {!loading &&
              clips.map(v => (
                <div
                  key={v.id}
                  className="flex flex-col sm:flex-row gap-3 p-3 rounded-lg border border-zinc-800 bg-zinc-900/50"
                >
                  <div className="flex flex-row sm:flex-col items-start sm:items-center gap-2 shrink-0 pt-0.5 sm:pt-0">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-zinc-600 text-red-600 focus:ring-red-600 shrink-0 mt-1 sm:mt-0"
                      checked={selectedIds.has(v.id)}
                      disabled={anyBusy || migrateBusy}
                      onChange={() => toggleSelect(v.id)}
                      aria-label={`Select clip: ${v.title}`}
                    />
                  </div>
                  <button
                    type="button"
                    className="w-full sm:w-40 aspect-video rounded-md overflow-hidden border border-zinc-700 shrink-0"
                    onClick={() => window.open(v.videoUrl, '_blank', 'noopener,noreferrer')}
                  >
                    <img
                      src={v.thumbnailUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </button>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="font-bold truncate">{v.title}</p>
                      <Badge variant="outline" className="text-[10px] border-zinc-600 shrink-0">
                        {v.communityVisibility}
                      </Badge>
                    </div>
                    <div className="flex flex-col gap-0.5 text-xs">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="text-zinc-200 font-medium truncate max-w-full">
                          {profilesByUid[v.ownerUserId]?.displayName?.trim() ||
                            v.ownerDisplayName?.trim() ||
                            'Unknown player'}
                        </span>
                        <span className="text-zinc-600 font-mono text-[10px] shrink-0">
                          {v.ownerUserId.slice(0, 8)}…
                        </span>
                      </div>
                      {profilesByUid[v.ownerUserId]?.email ? (
                        <span className="text-zinc-500 text-[11px] truncate">
                          {profilesByUid[v.ownerUserId]!.email}
                        </span>
                      ) : null}
                      {profilesByUid[v.ownerUserId]?.city?.trim() ? (
                        <span className="text-zinc-500 text-[11px] truncate">
                          {profilesByUid[v.ownerUserId]!.city.trim()}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-zinc-500">
                      {v.category} · {v.duration}
                      {v.moderatedAt && (
                        <span className="ml-2">
                          · Mod {v.moderatedAt.toLocaleString()}
                          {v.moderatedBy && ` by ${v.moderatedBy.slice(0, 8)}…`}
                        </span>
                      )}
                    </p>
                    {v.moderationRejectionReason && (
                      <p className="text-xs text-red-300/90 border-l-2 border-red-800 pl-2">
                        {v.moderationRejectionReason}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {(v.communityVisibility === 'pending' || v.communityVisibility === 'rejected') && (
                        <Button
                          type="button"
                          size="sm"
                          className="bg-emerald-700 hover:bg-emerald-600"
                          disabled={rowBusy(v.id)}
                          onClick={() => void approve(v.id)}
                        >
                          {actionBusy === v.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4 mr-1" />
                          )}
                          Approve
                        </Button>
                      )}
                      {v.communityVisibility === 'pending' && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-red-900/60 text-red-300"
                          disabled={rowBusy(v.id)}
                          onClick={() => openDeny(v.id)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Deny
                        </Button>
                      )}
                      {clipIsPublishedToCommunity(v.communityVisibility) && filter !== 'pending' && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-zinc-500 h-8"
                          disabled={rowBusy(v.id)}
                          onClick={() => openDeny(v.id)}
                        >
                          Revoke (deny)
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-red-950/80 bg-red-950/20 text-red-300 hover:bg-red-950/40 hover:text-red-200"
                        disabled={rowBusy(v.id)}
                        aria-label={`Delete clip ${v.title}`}
                        onClick={() => void removeClip(v)}
                      >
                        {deleteBusyId === v.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-1" />
                        )}
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
            </>
          )}
        </CardContent>

        {adminSection === 'clips' && (denyId || bulkDenyOpen) && (
          <div className="border-t border-zinc-800 p-4 bg-zinc-900/80 space-y-3 shrink-0">
            <p className="text-sm font-medium text-zinc-300">
              {bulkDenyOpen
                ? `Reason for denial — applied to ${selectedCount} selected clip(s) (shown to each player)`
                : 'Reason for denial (shown to the player)'}
            </p>
            <textarea
              className="w-full min-h-[5rem] bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-600/50"
              placeholder="e.g. Contains identifiable minors / not basketball-related / quality…"
              value={denyReason}
              onChange={e => setDenyReason(e.target.value)}
            />
            <div className="flex gap-2 justify-end flex-wrap">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setDenyId(null);
                  setBulkDenyOpen(false);
                  setDenyReason('');
                }}
              >
                Cancel
              </Button>
              {bulkDenyOpen ? (
                <Button
                  type="button"
                  className="bg-red-800 hover:bg-red-700"
                  disabled={!denyReason.trim() || bulkBusy === 'deny' || selectedCount === 0}
                  onClick={() => void submitBulkDeny()}
                >
                  {bulkBusy === 'deny' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    `Deny ${selectedCount} clip(s)`
                  )}
                </Button>
              ) : (
                <Button
                  type="button"
                  className="bg-red-800 hover:bg-red-700"
                  disabled={!denyReason.trim() || actionBusy === denyId}
                  onClick={() => void submitDeny()}
                >
                  {actionBusy === denyId ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit denial'}
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
