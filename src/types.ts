export type VideoCategory = 'run' | 'highlight' | 'training';

export type FeedScope = 'mine' | 'community';

/** Content Hub posting workflow — only `published` appears in the Content Hub feed */
export type CommunityVisibility = 'private' | 'pending' | 'published' | 'rejected';

export interface VideoMetadata {
  id: string;
  title: string;
  thumbnailUrl: string;
  videoUrl: string;
  /** Storage path for SDK download (`getBlob`) — avoids CORS on raw URL only after bucket CORS is set */
  videoStoragePath: string;
  thumbnailStoragePath: string;
  /** Formatted m:ss */
  duration: string;
  /** Raw seconds from storage (stats, downloads) */
  durationSec: number;
  createdAt: Date;
  category: VideoCategory;
  tags: string[];
  /** Firestore `userId` — clip owner */
  ownerUserId: string;
  /** Snapshot of owner display name when uploaded / last profile save (for moderators) */
  ownerDisplayName: string;
  communityVisibility: CommunityVisibility;
  /** Set by moderator when status is `rejected` */
  moderationRejectionReason: string;
  moderatedAt: Date | null;
  moderatedBy: string | null;
  /** Denormalized count of Firestore `clips/{id}/likes/{uid}` docs */
  likeCount: number;
}

export function clipRequestsCommunityShare(v: CommunityVisibility): boolean {
  return v === 'pending' || v === 'published';
}

export function clipIsPublishedToCommunity(v: CommunityVisibility): boolean {
  return v === 'published';
}

export interface User {
  id: string;
  name: string;
  avatar: string;
}
