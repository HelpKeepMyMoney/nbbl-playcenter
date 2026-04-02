import React, {useCallback, useEffect, useState} from 'react';
import {
  X,
  Share2,
  Heart,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trash2,
  Globe,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {motion} from 'motion/react';
import type {CommunityVisibility, VideoMetadata} from '@/src/types';
import {
  clipIsPublishedToCommunity,
  clipRequestsCommunityShare,
} from '@/src/types';
import {format} from 'date-fns';
import {isClipLiked, removeClipLike, toggleClipLike} from '@/src/lib/clipLikes';
import {getBlob, ref} from 'firebase/storage';
import {getFirebaseStorage} from '@/src/lib/firebase';

interface VideoPlayerProps {
  video: VideoMetadata;
  /** Ordered list (e.g. newest first) for prev/next navigation */
  videos: VideoMetadata[];
  onSelectVideo: (video: VideoMetadata) => void;
  onClose: () => void;
  /** Shown next to avatar (e.g. display name or email) */
  userLabel: string;
  /** Current user owns the clip — can delete and toggle Community request */
  viewerIsOwner: boolean;
  /** Owner-only: set Firestore `communityVisibility` */
  onSetOwnerCommunityVisibility: (clipId: string, next: CommunityVisibility) => Promise<void>;
  /** Permanently delete clip (Storage + Firestore); parent updates selection or closes. */
  onDeleteClip: (video: VideoMetadata) => Promise<void>;
}

function safeDownloadBasename(title: string): string {
  const t = title.replace(/[<>:"/\\|?*]/g, '').trim().slice(0, 80);
  return t || 'nbbl-clip';
}

export function VideoPlayer({
  video,
  videos,
  onSelectVideo,
  onClose,
  userLabel,
  viewerIsOwner,
  onSetOwnerCommunityVisibility,
  onDeleteClip,
}: VideoPlayerProps) {
  const [liked, setLiked] = useState(() => isClipLiked(video.id));
  const [shareHint, setShareHint] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [shareOnLocal, setShareOnLocal] = useState(() =>
    clipRequestsCommunityShare(video.communityVisibility),
  );
  const [publicBusy, setPublicBusy] = useState(false);
  const [publicError, setPublicError] = useState<string | null>(null);

  useEffect(() => {
    setLiked(isClipLiked(video.id));
    setDeleteError(null);
    setShareOnLocal(clipRequestsCommunityShare(video.communityVisibility));
    setPublicError(null);
  }, [video.id, video.communityVisibility]);

  useEffect(() => {
    if (!shareHint) return;
    const t = window.setTimeout(() => setShareHint(null), 2500);
    return () => clearTimeout(t);
  }, [shareHint]);

  const currentIndex = videos.findIndex(v => v.id === video.id);
  const canGoNewer = currentIndex > 0;
  const canGoOlder = currentIndex >= 0 && currentIndex < videos.length - 1;

  const goNewer = useCallback(() => {
    if (!canGoNewer) return;
    onSelectVideo(videos[currentIndex - 1]!);
  }, [canGoNewer, currentIndex, onSelectVideo, videos]);

  const goOlder = useCallback(() => {
    if (!canGoOlder) return;
    onSelectVideo(videos[currentIndex + 1]!);
  }, [canGoOlder, currentIndex, onSelectVideo, videos]);

  const handleLike = useCallback(() => {
    setLiked(toggleClipLike(video.id));
  }, [video.id]);

  const handleShare = useCallback(async () => {
    const text = `${video.title} — NBBL PlayCenter`;
    const payload: ShareData = {title: video.title, text, url: video.videoUrl};
    try {
      if (navigator.share) {
        if (!navigator.canShare || navigator.canShare(payload)) {
          await navigator.share(payload);
          setShareHint('Shared');
          return;
        }
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(video.videoUrl);
      setShareHint('Link copied to clipboard');
    } catch {
      setShareHint('Could not copy link');
    }
  }, [video.title, video.videoUrl]);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    const name = `${safeDownloadBasename(video.title)}.webm`;
    try {
      if (!video.videoStoragePath) {
        throw new Error('missing path');
      }
      // Uses Storage SDK XHR — still requires bucket CORS (see storage-cors.json + README).
      const blob = await getBlob(ref(getFirebaseStorage(), video.videoStoragePath));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.open(video.videoUrl, '_blank', 'noopener,noreferrer');
      setShareHint('Opened in a new tab — use your browser’s menu to save the file, or set Storage CORS (see README).');
    } finally {
      setDownloading(false);
    }
  }, [video.title, video.videoStoragePath, video.videoUrl]);

  const handleToggleCommunityShare = useCallback(
    async (checked: boolean) => {
      setPublicError(null);
      setPublicBusy(true);
      const prevVis = video.communityVisibility;
      let next: CommunityVisibility;
      if (!checked) {
        next = 'private';
      } else if (prevVis === 'published') {
        next = 'published';
      } else {
        next = 'pending';
      }
      setShareOnLocal(checked);
      try {
        await onSetOwnerCommunityVisibility(video.id, next);
      } catch (e) {
        setShareOnLocal(clipRequestsCommunityShare(prevVis));
        setPublicError(e instanceof Error ? e.message : 'Could not update visibility');
      } finally {
        setPublicBusy(false);
      }
    },
    [onSetOwnerCommunityVisibility, video.id, video.communityVisibility],
  );

  const handleDeleteClip = useCallback(async () => {
    if (
      !window.confirm(
        'Delete this clip permanently? The video and thumbnail will be removed from your library.',
      )
    ) {
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDeleteClip(video);
      removeClipLike(video.id);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Could not delete clip');
    } finally {
      setDeleting(false);
    }
  }, [onDeleteClip, video]);

  const positionLabel =
    currentIndex >= 0 && videos.length > 0
      ? `${currentIndex + 1} of ${videos.length}`
      : '—';

  return (
    <motion.div
      initial={{opacity: 0}}
      animate={{opacity: 1}}
      exit={{opacity: 0}}
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto overscroll-contain bg-black/90 p-3 sm:p-4 backdrop-blur-md pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]"
    >
      <Card className="my-auto w-full max-w-4xl min-h-0 gap-0 py-0 max-h-[calc(100dvh-1.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] sm:max-h-[calc(100dvh-2rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] flex flex-col bg-zinc-950 border-zinc-800 text-white overflow-hidden shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-zinc-800 p-3 sm:p-4 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Badge className="shrink-0 bg-orange-600 text-[10px] font-bold uppercase tracking-wider">
              {video.category}
            </Badge>
            <CardTitle className="text-base sm:text-lg font-bold tracking-tight truncate">
              {video.title}
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="shrink-0 min-h-11 min-w-11 text-zinc-400 hover:text-white"
            aria-label="Close and return to hub"
          >
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col min-h-0 overflow-y-auto p-0">
          <div className="relative flex w-full shrink-0 items-center justify-center bg-black max-h-[min(48dvh,56.25vw)] min-h-[10rem] sm:max-h-[min(60dvh,56.25vw)]">
            <video
              src={video.videoUrl}
              controls
              autoPlay
              playsInline
              className="max-h-[min(48dvh,56.25vw)] w-full object-contain sm:max-h-[min(60dvh,56.25vw)]"
            />
          </div>

          <div
            className="flex items-center justify-between gap-2 px-3 py-2 sm:px-4 border-b border-zinc-800 bg-zinc-900/50 shrink-0"
            role="navigation"
            aria-label="Clip navigation"
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11 flex-1 sm:flex-none border-zinc-700 bg-zinc-900 hover:bg-zinc-800"
              onClick={goNewer}
              disabled={!canGoNewer || deleting}
              aria-label="Newer clip in library"
            >
              <ChevronLeft className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Newer</span>
            </Button>
            <span className="text-xs sm:text-sm font-mono text-zinc-400 tabular-nums px-2 text-center shrink-0">
              {positionLabel}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11 flex-1 sm:flex-none border-zinc-700 bg-zinc-900 hover:bg-zinc-800"
              onClick={goOlder}
              disabled={!canGoOlder || deleting}
              aria-label="Older clip in library"
            >
              <span className="hidden sm:inline">Older</span>
              <ChevronRight className="h-4 w-4 sm:ml-1" />
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-6 p-4 pb-6 sm:gap-8 sm:p-6 md:grid-cols-3 md:pb-8">
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-4">
                <img src="/logo.png" alt="" className="h-10 w-10 object-contain shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">{userLabel}</p>
                  <p className="text-[11px] text-zinc-500">
                    {format(video.createdAt, 'MMMM d, yyyy · h:mm a')}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-zinc-300 leading-relaxed">
                  {viewerIsOwner
                    ? `Your ${video.category} clip. Community sharing is reviewed by a moderator before it goes live.`
                    : `An approved ${video.category} clip in Community.`}
                </p>

                {viewerIsOwner && video.communityVisibility === 'pending' && (
                  <div className="mt-3 rounded-lg border border-amber-800/50 bg-amber-950/25 px-3 py-2 text-sm text-amber-200 flex gap-2 items-start">
                    <Clock className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                      <span className="font-bold text-amber-100">In review</span>
                      <span className="block text-xs text-amber-200/80 mt-0.5">
                        A moderator will approve or deny your Community request. You’ll see the result here.
                      </span>
                    </span>
                  </div>
                )}

                {viewerIsOwner && video.communityVisibility === 'published' && (
                  <div className="mt-3 rounded-lg border border-emerald-800/50 bg-emerald-950/20 px-3 py-2 text-sm text-emerald-200 flex gap-2 items-start">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                      <span className="font-bold text-emerald-100">Approved</span>
                      <span className="block text-xs text-emerald-200/80 mt-0.5">
                        Your clip is live in Community. Uncheck below to remove it from Community (private again).
                      </span>
                    </span>
                  </div>
                )}

                {viewerIsOwner && video.communityVisibility === 'rejected' && (
                  <div className="mt-3 rounded-lg border border-red-900/50 bg-red-950/25 px-3 py-2 text-sm text-red-200 flex gap-2 items-start">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                      <span className="font-bold text-red-100">Denied for Community</span>
                      {video.moderationRejectionReason ? (
                        <span className="block text-xs text-red-200/90 mt-1.5 whitespace-pre-wrap">
                          {video.moderationRejectionReason}
                        </span>
                      ) : (
                        <span className="block text-xs text-red-200/70 mt-0.5">No reason was provided.</span>
                      )}
                      <span className="block text-xs text-zinc-400 mt-2">
                        Check the box below to send again for another review.
                      </span>
                    </span>
                  </div>
                )}

                {viewerIsOwner && (
                  <label className="flex items-start gap-3 mt-4 p-3 rounded-lg border border-zinc-800 bg-zinc-900/80 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-zinc-600 text-orange-600 focus:ring-orange-600 shrink-0"
                      checked={shareOnLocal}
                      disabled={publicBusy || deleting}
                      onChange={e => void handleToggleCommunityShare(e.target.checked)}
                    />
                    <span className="text-sm text-zinc-300 flex-1 min-w-0">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-emerald-400" />
                        Request Community
                      </span>
                      <span className="block text-xs text-zinc-500 mt-1">
                        When checked, moderators can approve your clip for Community. Uncheck to keep it private.
                      </span>
                    </span>
                    {publicBusy ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-orange-500" />
                    ) : null}
                  </label>
                )}
                {!viewerIsOwner && clipIsPublishedToCommunity(video.communityVisibility) && (
                  <p className="text-xs text-emerald-500/90 mt-3 flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5" />
                    Approved Community clip
                  </p>
                )}
                {publicError && <p className="text-xs text-red-400 mt-2">{publicError}</p>}
                <div className="flex flex-wrap gap-2">
                  {video.tags.map(tag => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="bg-zinc-900 border-zinc-800 text-zinc-400 text-[10px]"
                    >
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                {shareHint && (
                  <p className="text-xs text-zinc-400 text-center" role="status">
                    {shareHint}
                  </p>
                )}
                <Button
                  type="button"
                  className={`w-full min-h-11 ${liked ? 'bg-zinc-800 hover:bg-zinc-700 text-orange-500 border border-orange-600' : 'bg-orange-600 hover:bg-orange-700'}`}
                  onClick={handleLike}
                  disabled={deleting}
                  aria-pressed={liked}
                  aria-label={liked ? 'Unlike this clip' : 'Like this clip'}
                >
                  <Heart className={`mr-2 h-4 w-4 ${liked ? 'fill-current' : ''}`} />
                  {liked ? 'Liked' : 'Like'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full min-h-11 border-zinc-800 bg-zinc-900 hover:bg-zinc-800"
                  onClick={() => void handleShare()}
                  disabled={deleting}
                >
                  <Share2 className="mr-2 h-4 w-4" /> Share
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full min-h-11 border-zinc-800 bg-zinc-900 hover:bg-zinc-800"
                  onClick={() => void handleDownload()}
                  disabled={downloading || deleting}
                  aria-label="Download video file"
                >
                  {downloading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  {downloading ? 'Downloading…' : 'Download'}
                </Button>
                {deleteError && <p className="text-xs text-red-400 text-center">{deleteError}</p>}
                {viewerIsOwner && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full min-h-11 border-red-900/60 bg-red-950/30 text-red-300 hover:bg-red-950/50 hover:text-red-200"
                    onClick={() => void handleDeleteClip()}
                    disabled={deleting || downloading}
                    aria-label="Delete clip permanently"
                  >
                    {deleting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    {deleting ? 'Deleting…' : 'Delete clip'}
                  </Button>
                )}
              </div>

              <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800">
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">
                  Stats
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-zinc-500">Duration</p>
                    <p className="text-sm font-bold tabular-nums">{video.duration}</p>
                    <p className="text-[11px] text-zinc-600 tabular-nums mt-0.5">
                      {video.durationSec.toFixed(1)}s
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Category</p>
                    <p className="text-sm font-bold capitalize">{video.category}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Tags</p>
                    <p className="text-sm font-bold">{video.tags.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">In library</p>
                    <p className="text-sm font-bold">{positionLabel}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
