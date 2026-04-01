import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Timestamp,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import {getDownloadURL, ref, uploadBytes, uploadBytesResumable} from 'firebase/storage';
import type {VideoCategory, VideoMetadata} from '@/src/types';
import {formatDurationSec} from './duration';
import {getFirebaseDb, getFirebaseStorage} from './firebase';

export interface ClipUploadPayload {
  videoBlob: Blob;
  thumbnailBlob: Blob;
  durationSec: number;
  title: string;
  category: VideoCategory;
  tags: string[];
}

interface ClipDoc {
  userId: string;
  title: string;
  category: VideoCategory;
  videoStoragePath: string;
  thumbnailStoragePath: string;
  durationSec: number;
  createdAt: Timestamp;
  tags: string[];
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
    duration: formatDurationSec(durationSec),
    durationSec,
    createdAt: data.createdAt.toDate(),
    category: data.category,
    tags: data.tags ?? [],
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
          snapshot.docs.map(d => docToVideoMetadata(d.id, d.data() as ClipDoc)),
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
  } satisfies ClipDoc);
}
