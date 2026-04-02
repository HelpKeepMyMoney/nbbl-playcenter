/** Max clip length (seconds) — must match recorder cap. */
export const MAX_CLIP_DURATION_SEC = 60;

/** Max file size after processing (bytes). */
export const MAX_VIDEO_BYTES = 20 * 1024 * 1024;

const MIN_VIDEO_BITRATE = 350_000;

/** Prefer WebM for MediaRecorder + captureStream; avoid video/mp4 here (often errors when muxing capture output). */
function pickRecorderMimeType(): string {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return '';
}

function createMediaRecorder(
  stream: MediaStream,
  mime: string,
  videoBitsPerSecond: number,
): MediaRecorder {
  if (mime && MediaRecorder.isTypeSupported(mime)) {
    try {
      return new MediaRecorder(stream, {mimeType: mime, videoBitsPerSecond});
    } catch {
      /* fall through */
    }
    try {
      return new MediaRecorder(stream, {mimeType: mime});
    } catch {
      /* fall through */
    }
  }
  try {
    return new MediaRecorder(stream, {videoBitsPerSecond});
  } catch {
    /* fall through */
  }
  return new MediaRecorder(stream);
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
 * Uses **video-only** capture for encoder stability (some sources’ audio tracks break VP8/VP9+Opus mux).
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
  video.muted = true;
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.src = url;

  let recorder: MediaRecorder | null = null;

  try {
    await waitCanPlay(video);
    await seekTo(video, trimStartSec);
    await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));

    const cap = (video as HTMLVideoElement & {captureStream?: (fps?: number) => MediaStream})
      .captureStream;
    if (!cap) {
      throw new Error('Trimming requires captureStream (try another browser).');
    }

    const captured = cap.call(video, 30);
    const vTracks = captured.getVideoTracks();
    if (vTracks.length === 0) {
      throw new Error('No video track from captureStream.');
    }
    const stream = new MediaStream(vTracks);

    await video.play().catch(() => {
      throw new Error('Could not play video for trimming — try another clip or browser.');
    });
    await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));

    recorder = createMediaRecorder(stream, mime, videoBitsPerSecond);

    const chunks: Blob[] = [];
    const blobPromise = new Promise<Blob>((resolve, reject) => {
      recorder!.ondataavailable = e => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder!.onerror = ev => {
        const err = (ev as ErrorEvent & {error?: DOMException}).error;
        reject(
          new Error(
            err?.message
              ? `Recording failed: ${err.message}`
              : 'Recording failed (encoder error — try a shorter trim or another browser).',
          ),
        );
      };
      recorder!.onstop = () => {
        const blob = new Blob(chunks, {type: mime || 'video/webm'});
        if (blob.size < 32) {
          reject(new Error('Recording produced an empty file — try trimming again.'));
          return;
        }
        resolve(blob);
      };
    });

    recorder.start(100);

    const end = trimEndSec;
    await new Promise<void>((resolve, reject) => {
      const wallMs = Math.min(120_000, Math.max(45_000, (trimEndSec - trimStartSec) * 1000 + 20_000));
      const deadline = Date.now() + wallMs;
      const tick = () => {
        if (Date.now() > deadline) {
          video.pause();
          try {
            if (recorder!.state !== 'inactive') recorder!.stop();
          } catch {
            /* ignore */
          }
          reject(new Error('Processing timed out'));
          return;
        }
        if (video.currentTime >= end - 0.06 || video.ended) {
          video.pause();
          try {
            if (recorder!.state !== 'inactive') recorder!.requestData();
            if (recorder!.state !== 'inactive') recorder!.stop();
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
            if (recorder!.state !== 'inactive') recorder!.stop();
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
    try {
      if (recorder && recorder.state !== 'inactive') recorder.stop();
    } catch {
      /* ignore */
    }
    video.pause();
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
