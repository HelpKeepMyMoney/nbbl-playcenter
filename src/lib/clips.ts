import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
  uploadBytesResumable,
} from 'firebase/storage';
import type {CommunityVisibility, VideoCategory, VideoMetadata} from '@/src/types';
import {formatDurationSec} from './duration';
import {getFirebaseAuth, getFirebaseDb, getFirebaseStorage} from './firebase';

export interface ClipUploadPayload {
  videoBlob: Blob;
  thumbnailBlob: Blob;
  durationSec: number;
  title: string;
  category: VideoCategory;
  tags: string[];
  /** Submit for moderator review (becomes `pending`) */
  requestCommunityPublic: boolean;
  /** Shown to admins — set by app from auth (optional on record step, required before upload) */
  ownerDisplayName?: string;
}

export type ModerationFilter = 'pending' | 'published' | 'rejected' | 'private' | 'all';

interface ClipDoc {
  userId: string;
  title: string;
  category: VideoCategory;
  videoStoragePath: string;
  thumbnailStoragePath: string;
  durationSec: number;
  createdAt: Timestamp;
  tags: string[];
  communityVisibility: CommunityVisibility;
  moderationRejectionReason: string;
  moderatedAt?: Timestamp;
  moderatedBy?: string;
  ownerDisplayName: string;
}

function normalizeCommunityVisibility(raw: Record<string, unknown>): CommunityVisibility {
  const v = raw.communityVisibility;
  if (v === 'private' || v === 'pending' || v === 'published' || v === 'rejected') {
    return v;
  }
  if (raw.isPublic === true) {
    return 'published';
  }
  return 'private';
}

function normalizeClipDoc(raw: Record<string, unknown>): ClipDoc {
  const d = raw as Partial<ClipDoc> & {isPublic?: boolean};
  const communityVisibility = normalizeCommunityVisibility(raw);
  const modReason =
    typeof d.moderationRejectionReason === 'string' ? d.moderationRejectionReason : '';
  return {
    userId: String(d.userId ?? ''),
    title: String(d.title ?? ''),
    category: (d.category as VideoCategory) ?? 'run',
    videoStoragePath: String(d.videoStoragePath ?? ''),
    thumbnailStoragePath: String(d.thumbnailStoragePath ?? ''),
    durationSec: typeof d.durationSec === 'number' ? d.durationSec : 0,
    createdAt: d.createdAt instanceof Timestamp ? d.createdAt : Timestamp.now(),
    tags: Array.isArray(d.tags) ? (d.tags as string[]) : [],
    communityVisibility,
    moderationRejectionReason: modReason,
    moderatedAt: d.moderatedAt instanceof Timestamp ? d.moderatedAt : undefined,
    moderatedBy: typeof d.moderatedBy === 'string' ? d.moderatedBy : undefined,
    ownerDisplayName:
      typeof d.ownerDisplayName === 'string' ? d.ownerDisplayName : '',
  };
}

async function docToVideoMetadata(id: string, data: ClipDoc): Promise<VideoMetadata> {
  const storage = getFirebaseStorage();
  const [videoUrl, thumbnailUrl] = await Promise.all([
    getDownloadURL(ref(storage, data.videoStoragePath)),
    getDownloadURL(ref(storage, data.thumbnailStoragePath)),
  ]);
  const durationSec =
    typeof data.durationSec === 'number' && Number.isFinite(data.durationSec)
      ? data.durationSec
      : 0;
  return {
    id,
    title: data.title,
    thumbnailUrl,
    videoUrl,
    videoStoragePath: data.videoStoragePath ?? '',
    thumbnailStoragePath: data.thumbnailStoragePath ?? '',
    duration: formatDurationSec(durationSec),
    durationSec,
    createdAt: data.createdAt.toDate(),
    category: data.category,
    tags: data.tags ?? [],
    ownerUserId: data.userId,
    ownerDisplayName: data.ownerDisplayName ?? '',
    communityVisibility: data.communityVisibility,
    moderationRejectionReason: data.moderationRejectionReason ?? '',
    moderatedAt: data.moderatedAt ? data.moderatedAt.toDate() : null,
    moderatedBy: data.moderatedBy ?? null,
  };
}

export function subscribeToMyClips(
  userId: string,
  onData: (videos: VideoMetadata[]) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  const db = getFirebaseDb();
  const q = query(
    collection(db, 'clips'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
  );

  let generation = 0;
  return onSnapshot(
    q,
    async snapshot => {
      const mine = ++generation;
      try {
        const list = await Promise.all(
          snapshot.docs.map(d =>
            docToVideoMetadata(d.id, normalizeClipDoc(d.data() as Record<string, unknown>)),
          ),
        );
        if (mine !== generation) return;
        onData(list);
      } catch (e) {
        if (mine !== generation) return;
        onError(e instanceof Error ? e : new Error(String(e)));
      }
    },
    err => onError(err),
  );
}

export function subscribeToPublishedCommunityClips(
  onData: (videos: VideoMetadata[]) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  const db = getFirebaseDb();
  const q = query(
    collection(db, 'clips'),
    where('communityVisibility', '==', 'published'),
    orderBy('createdAt', 'desc'),
  );

  let generation = 0;
  return onSnapshot(
    q,
    async snapshot => {
      const mine = ++generation;
      try {
        const list = await Promise.all(
          snapshot.docs.map(d =>
            docToVideoMetadata(d.id, normalizeClipDoc(d.data() as Record<string, unknown>)),
          ),
        );
        if (mine !== generation) return;
        onData(list);
      } catch (e) {
        if (mine !== generation) return;
        onError(e instanceof Error ? e : new Error(String(e)));
      }
    },
    err => onError(err),
  );
}

export function subscribeToClipsForModeration(
  filter: ModerationFilter,
  onData: (videos: VideoMetadata[]) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  const db = getFirebaseDb();
  const coll = collection(db, 'clips');
  const q =
    filter === 'all'
      ? query(coll, orderBy('createdAt', 'desc'), limit(400))
      : query(
          coll,
          where('communityVisibility', '==', filter),
          orderBy('createdAt', 'desc'),
          limit(400),
        );

  let generation = 0;
  return onSnapshot(
    q,
    async snapshot => {
      const mine = ++generation;
      try {
        const cu = getFirebaseAuth().currentUser;
        if (cu) {
          await cu.getIdToken(true);
        }
        const list: VideoMetadata[] = await Promise.all(
          snapshot.docs.map(d =>
            docToVideoMetadata(d.id, normalizeClipDoc(d.data() as Record<string, unknown>)),
          ),
        );
        if (mine !== generation) return;
        onData(list);
      } catch (e) {
        if (mine !== generation) return;
        onError(e instanceof Error ? e : new Error(String(e)));
      }
    },
    err => onError(err),
  );
}

export async function setOwnerClipCommunityVisibility(
  clipId: string,
  next: CommunityVisibility,
): Promise<void> {
  const db = getFirebaseDb();
  await updateDoc(doc(db, 'clips', clipId), {communityVisibility: next});
}

export async function moderateClipByAdmin(
  clipId: string,
  decision: 'published' | 'rejected',
  rejectionReason: string,
  moderatorUid: string,
): Promise<void> {
  const db = getFirebaseDb();
  const trimmed = rejectionReason.trim();
  if (decision === 'rejected' && !trimmed) {
    throw new Error('Enter a reason when denying a clip.');
  }
  await updateDoc(doc(db, 'clips', clipId), {
    communityVisibility: decision,
    moderationRejectionReason: decision === 'rejected' ? trimmed : '',
    moderatedAt: Timestamp.now(),
    moderatedBy: moderatorUid,
  });
}

/** One-time: legacy `isPublic: true` docs without `communityVisibility` → published. */
export async function migrateLegacyPublicClips(): Promise<number> {
  const db = getFirebaseDb();
  const q = query(collection(db, 'clips'), where('isPublic', '==', true), limit(500));
  const snap = await getDocs(q);
  let count = 0;
  const batch = writeBatch(db);
  snap.docs.forEach(d => {
    const data = d.data() as Record<string, unknown>;
    if (data.communityVisibility != null && data.communityVisibility !== '') {
      return;
    }
    batch.update(d.ref, {
      communityVisibility: 'published',
      moderationRejectionReason: '',
    });
    count += 1;
  });
  if (count > 0) {
    await batch.commit();
  }
  return count;
}

const OWNER_LABEL_MAX = 200;

function sanitizeOwnerLabel(raw: string): string {
  return raw.trim().slice(0, OWNER_LABEL_MAX) || 'Player';
}

/** Updates `ownerDisplayName` on all clips owned by the user (e.g. after profile name change). */
export async function syncOwnerDisplayNameOnMyClips(
  userId: string,
  ownerDisplayName: string,
): Promise<void> {
  const label = sanitizeOwnerLabel(ownerDisplayName);
  const db = getFirebaseDb();
  const q = query(collection(db, 'clips'), where('userId', '==', userId), limit(500));
  const snap = await getDocs(q);
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.update(d.ref, {ownerDisplayName: label}));
  await batch.commit();
}

export async function uploadClip(
  userId: string,
  payload: ClipUploadPayload,
  onProgress?: (percent: number) => void,
): Promise<void> {
  const db = getFirebaseDb();
  const storage = getFirebaseStorage();
  const clipId = crypto.randomUUID();
  const base = `clips/${userId}/${clipId}`;
  const videoPath = `${base}/video.webm`;
  const thumbPath = `${base}/thumb.jpg`;
  const videoRef = ref(storage, videoPath);
  const thumbRef = ref(storage, thumbPath);

  const videoTask = uploadBytesResumable(videoRef, payload.videoBlob, {
    contentType: payload.videoBlob.type || 'video/webm',
  });

  await new Promise<void>((resolve, reject) => {
    videoTask.on(
      'state_changed',
      snap => {
        const pct = snap.totalBytes ? (snap.bytesTransferred / snap.totalBytes) * 100 : 0;
        onProgress?.(pct);
      },
      reject,
      () => resolve(),
    );
  });

  onProgress?.(100);
  await uploadBytes(thumbRef, payload.thumbnailBlob, {
    contentType: 'image/jpeg',
  });

  const communityVisibility: CommunityVisibility = payload.requestCommunityPublic
    ? 'pending'
    : 'private';

  const clipRef = doc(db, 'clips', clipId);
  await setDoc(clipRef, {
    userId,
    title: payload.title,
    category: payload.category,
    videoStoragePath: videoPath,
    thumbnailStoragePath: thumbPath,
    durationSec: payload.durationSec,
    createdAt: Timestamp.now(),
    tags: payload.tags,
    communityVisibility,
    moderationRejectionReason: '',
    ownerDisplayName: sanitizeOwnerLabel(payload.ownerDisplayName ?? ''),
  } satisfies ClipDoc);
}

function storageObjectNotFound(e: unknown): boolean {
  return (
    typeof e === 'object' &&
    e !== null &&
    'code' in e &&
    (e as {code?: string}).code === 'storage/object-not-found'
  );
}

async function deleteStorageObject(path: string): Promise<void> {
  if (!path) return;
  const storage = getFirebaseStorage();
  try {
    await deleteObject(ref(storage, path));
  } catch (e) {
    if (!storageObjectNotFound(e)) throw e;
  }
}

/** Removes clip doc and both Storage objects (owner-only; paths must be under `clips/{userId}/`). */
export async function deleteClip(
  userId: string,
  clip: Pick<VideoMetadata, 'id' | 'videoStoragePath' | 'thumbnailStoragePath'>,
): Promise<void> {
  const prefix = `clips/${userId}/`;
  if (
    !clip.videoStoragePath.startsWith(prefix) ||
    !clip.thumbnailStoragePath.startsWith(prefix)
  ) {
    throw new Error('Invalid clip storage paths');
  }
  await Promise.all([
    deleteStorageObject(clip.videoStoragePath),
    deleteStorageObject(clip.thumbnailStoragePath),
  ]);
  const db = getFirebaseDb();
  await deleteDoc(doc(db, 'clips', clip.id));
}
