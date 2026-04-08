import React, {useEffect, useState} from 'react';
import {doc, getDoc} from 'firebase/firestore';
import {Play, Tag, Globe, Clock, Ban, User, Heart} from 'lucide-react';
import {Card, CardContent} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {VideoMetadata} from '@/src/types';
import {format} from 'date-fns';
import {getFirebaseDb} from '@/src/lib/firebase';

interface VideoCardProps {
  video: VideoMetadata;
  onClick: (video: VideoMetadata) => void;
  /** On “My clips”, show Content Hub moderation status */
  showModerationState?: boolean;
  /** Current user — used to show whether you liked this clip */
  viewerUid: string;
}

const ownerLabel = (v: VideoMetadata) => v.ownerDisplayName?.trim() || 'Player';

function formatLikeCount(n: number): string {
  const k = Math.max(0, Math.floor(n));
  return k > 999 ? `${(k / 1000).toFixed(1)}k` : String(k);
}

export function VideoCard({video, onClick, showModerationState, viewerUid}: VideoCardProps) {
  const [viewerLiked, setViewerLiked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const snap = await getDoc(doc(getFirebaseDb(), 'clips', video.id, 'likes', viewerUid));
      if (!cancelled) setViewerLiked(snap.exists());
    })();
    return () => {
      cancelled = true;
    };
  }, [video.id, viewerUid]);

  return (
    <Card
      className="group relative overflow-hidden bg-zinc-900 border-zinc-800 hover:border-red-600/50 transition-all cursor-pointer"
      onClick={() => onClick(video)}
    >
      <div className="relative aspect-video overflow-hidden">
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110 motion-reduce:group-hover:scale-100"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="h-12 w-12 rounded-full bg-red-600 flex items-center justify-center text-white shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
            <Play className="h-6 w-6 fill-current" />
          </div>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-10 pb-2 px-2.5">
          <p className="text-[11px] font-semibold text-white truncate pr-14 drop-shadow-sm">
            {ownerLabel(video)}
          </p>
          <p className="text-[10px] text-zinc-300 tabular-nums mt-0.5 drop-shadow-sm">
            {format(video.createdAt, 'MMM d, yyyy · h:mm a')}
          </p>
        </div>
        <div className="absolute bottom-2 right-2 z-[1]">
          <Badge variant="secondary" className="bg-black/80 text-white border-none font-mono text-[10px]">
            {video.duration}
          </Badge>
        </div>
        <div className="absolute top-2 right-2 z-[1] flex items-center gap-1 rounded-md bg-black/75 px-1.5 py-1 text-[10px] font-semibold text-white tabular-nums border border-white/10">
          <Heart className={`h-3 w-3 shrink-0 ${viewerLiked ? 'fill-red-500 text-red-500' : 'text-zinc-300'}`} />
          <span>{formatLikeCount(video.likeCount)}</span>
        </div>
        <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
          <Badge
            className={`
            ${video.category === 'run' ? 'bg-blue-600' : ''}
            ${video.category === 'highlight' ? 'bg-red-600' : ''}
            ${video.category === 'training' ? 'bg-green-600' : ''}
            text-[10px] font-bold uppercase tracking-wider border-none
          `}
          >
            {video.category}
          </Badge>
          {showModerationState && video.communityVisibility === 'published' && (
            <Badge className="inline-flex items-center bg-zinc-900/90 text-emerald-400 border border-emerald-700/60 text-[10px] font-bold uppercase tracking-wider gap-1">
              <Globe className="h-3 w-3" />
              Live
            </Badge>
          )}
          {showModerationState && video.communityVisibility === 'pending' && (
            <Badge className="inline-flex items-center bg-zinc-900/90 text-amber-400 border border-amber-700/60 text-[10px] font-bold uppercase tracking-wider gap-1">
              <Clock className="h-3 w-3" />
              Review
            </Badge>
          )}
          {showModerationState && video.communityVisibility === 'rejected' && (
            <Badge className="inline-flex items-center bg-zinc-900/90 text-red-400 border border-red-800/60 text-[10px] font-bold uppercase tracking-wider gap-1">
              <Ban className="h-3 w-3" />
              Denied
            </Badge>
          )}
        </div>
      </div>

      <CardContent className="p-4 space-y-2">
        <h3 className="font-bold text-white line-clamp-1 group-hover:text-red-500 transition-colors">
          {video.title}
        </h3>
        <div className="flex items-center justify-between text-[11px] text-zinc-500 font-medium">
          <div className="flex items-center gap-1 min-w-0">
            <User className="h-3 w-3 shrink-0" />
            <span className="truncate">{ownerLabel(video)}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Tag className="h-3 w-3" />
            {video.tags[0] ?? '—'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
