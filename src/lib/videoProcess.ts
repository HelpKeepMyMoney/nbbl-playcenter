/** Max clip length (seconds) — must match recorder cap. */
export const MAX_CLIP_DURATION_SEC = 60;

/** Max file size after processing (bytes). */
export const MAX_VIDEO_BYTES = 20 * 1024 * 1024;

const MIN_VIDEO_BITRATE = 350_000;

function pickRecorderMimeType(): string {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ];
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return '';
}

/** Duration in seconds, capped (same strategy as Recorder). */
export function readDurationSecFromVideoBlob(blob: Blob, capSec: number): Promise<number> {
  return new Promise(resolve => {
    const url = URL.createObjectURL(blob);
    const v = document.createElement('video');
    v.preload = 'auto';
    v.muted = true;
    v.playsInline = true;
    v.src = url;

    let settled = false;
    const finish = (sec: number) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      resolve(Math.min(Math.max(0, sec), capSec));
    };

    const tryRead = (): number | null => {
      try {
        if (v.seekable && v.seekable.length > 0) {
          const end = v.seekable.end(v.seekable.length - 1);
          if (Number.isFinite(end) && end > 0) return end;
        }
      } catch {
        /* ignore */
      }
      const d = v.duration;
      if (Number.isFinite(d) && d > 0 && d < capSec + 1) return d;
      return null;
    };

    const onProbe = () => {
      const n = tryRead();
      if (n != null) finish(n);
    };

    v.addEventListener('loadedmetadata', onProbe);
    v.addEventListener('durationchange', onProbe);
    v.addEventListener('loadeddata', onProbe);
    v.addEventListener('error', () => finish(0));

    window.setTimeout(() => {
      const n = tryRead();
      finish(n ?? 0);
    }, 3000);
  });
}

function waitCanPlay(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve, reject) => {
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      resolve();
      return;
    }
    const ok = () => {
      video.removeEventListener('canplay', ok);
      video.removeEventListener('error', err);
      resolve();
    };
    const err = () => {
      video.removeEventListener('canplay', ok);
      video.removeEventListener('error', err);
      reject(new Error('Could not load video'));
    };
    video.addEventListener('canplay', ok);
    video.addEventListener('error', err);
  });
}

function seekTo(video: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      resolve();
    };
    video.addEventListener('seeked', onSeeked);
    try {
      video.currentTime = Math.max(0, t);
    } catch (e) {
      video.removeEventListener('seeked', onSeeked);
      reject(e instanceof Error ? e : new Error('Seek failed'));
    }
  });
}

/**
 * Re-encodes [trimStartSec, trimEndSec] into a new blob using MediaRecorder + captureStream.
 * Audio is included when present (video not muted during capture).
 */
async function recordSegmentToBlob(
  input: Blob,
  trimStartSec: number,
  trimEndSec: number,
  videoBitsPerSecond: number,
): Promise<Blob> {
  const mime = pickRecorderMimeType();
  if (!mime) {
    throw new Error('Video encoding is not supported in this browser.');
  }

  const url = URL.createObjectURL(input);
  const video = document.createElement('video');
  video.playsInline = true;
  video.muted = false;
  video.volume = 0.001;
  video.src = url;

  try {
    await waitCanPlay(video);
    await seekTo(video, trimStartSec);
    await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));

    const cap = (video as HTMLVideoElement & {captureStream?: (fps?: number) => MediaStream})
      .captureStream;
    if (!cap) {
      throw new Error('Trimming requires captureStream (try another browser).');
    }
    const stream = cap.call(video, 30);
    const recOpts: MediaRecorderOptions = {videoBitsPerSecond};
    if (mime) recOpts.mimeType = mime;
    const recorder = MediaRecorder.isTypeSupported(mime)
      ? new MediaRecorder(stream, recOpts)
      : new MediaRecorder(stream, {videoBitsPerSecond});

    const chunks: Blob[] = [];
    const blobPromise = new Promise<Blob>((resolve, reject) => {
      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onerror = () => reject(new Error('Recording failed'));
      recorder.onstop = () => {
        resolve(new Blob(chunks, {type: mime || 'video/webm'}));
      };
    });

    recorder.start(250);
    await video.play();

    const end = trimEndSec;
    await new Promise<void>((resolve, reject) => {
      const wallMs = Math.min(120_000, Math.max(45_000, (trimEndSec - trimStartSec) * 1000 + 20_000));
      const deadline = Date.now() + wallMs;
      const tick = () => {
        if (Date.now() > deadline) {
          video.pause();
          try {
            if (recorder.state !== 'inactive') recorder.stop();
          } catch {
            /* ignore */
          }
          reject(new Error('Processing timed out'));
          return;
        }
        if (video.currentTime >= end - 0.06 || video.ended) {
          video.pause();
          try {
            if (recorder.state !== 'inactive') recorder.stop();
          } catch {
            /* ignore */
          }
          resolve();
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      video.addEventListener(
        'error',
        () => {
          try {
            if (recorder.state !== 'inactive') recorder.stop();
          } catch {
            /* ignore */
          }
          reject(new Error('Playback error while processing'));
        },
        {once: true},
      );
    });

    return await blobPromise;
  } finally {
    URL.revokeObjectURL(url);
    video.removeAttribute('src');
    video.load();
  }
}

export interface PreparedClipResult {
  blob: Blob;
  durationSec: number;
}

/**
 * Trim + re-encode with falling bitrate until under {@link MAX_VIDEO_BYTES} or min bitrate.
 */
export async function prepareClipForUpload(
  input: Blob,
  trimStartSec: number,
  trimEndSec: number,
): Promise<PreparedClipResult> {
  const fullDur = await readDurationSecFromVideoBlob(input, 7200);
  const start = Math.max(0, Math.min(trimStartSec, fullDur));
  let end = Math.max(start + 0.25, Math.min(trimEndSec, fullDur));
  if (end - start > MAX_CLIP_DURATION_SEC) {
    end = start + MAX_CLIP_DURATION_SEC;
  }
  const durationSec = end - start;
  if (durationSec < 0.25) {
    throw new Error('Selected segment is too short.');
  }

  let bitrate = 2_800_000;
  let lastBlob: Blob | null = null;

  while (bitrate >= MIN_VIDEO_BITRATE) {
    lastBlob = await recordSegmentToBlob(input, start, end, bitrate);
    if (lastBlob.size <= MAX_VIDEO_BYTES) {
      return {blob: lastBlob, durationSec};
    }
    bitrate = Math.floor(bitrate * 0.62);
  }

  throw new Error(
    'Video is still over 20 MB after compression. Trim a shorter segment and try again.',
  );
}

export function videoExtensionForBlob(blob: Blob): 'webm' | 'mp4' {
  const t = blob.type.toLowerCase();
  if (t.includes('mp4') || t.includes('quicktime')) return 'mp4';
  return 'webm';
}

/** Fast path: in-app recording already capped at 60s and under size limit — no re-encode. */
export function canSkipCameraTranscode(
  blob: Blob,
  trimStart: number,
  trimEnd: number,
  fullDurSec: number,
): boolean {
  if (blob.size > MAX_VIDEO_BYTES) return false;
  if (fullDurSec > MAX_CLIP_DURATION_SEC + 0.08) return false;
  if (trimStart > 0.08) return false;
  const cap = Math.min(fullDurSec, MAX_CLIP_DURATION_SEC);
  if (trimEnd < cap - 0.12) return false;
  return true;
}
