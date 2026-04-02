/** Max clip length (seconds) — must match recorder cap. */
export const MAX_CLIP_DURATION_SEC = 60;

/** Max file size after processing (bytes). */
export const MAX_VIDEO_BYTES = 20 * 1024 * 1024;

const MIN_VIDEO_BITRATE = 350_000;

/**
 * Prefer VP8 before VP9 for canvas.captureStream output — some GPUs/browsers fail VP9 with “Encoding failed”.
 * Omit audio codec when possible (video-only stream) via plain video/webm fallback.
 */
function pickRecorderMimeType(): string {
  const candidates = [
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return '';
}

const MAX_TRANSCODE_LONG_EDGE = 1280;

function canvasSizeForTranscode(videoWidth: number, videoHeight: number): {cw: number; ch: number} {
  const max = MAX_TRANSCODE_LONG_EDGE;
  const vw = Math.max(2, Math.floor(videoWidth));
  const vh = Math.max(2, Math.floor(videoHeight));
  if (vw <= max && vh <= max) return {cw: vw, ch: vh};
  if (vw >= vh) {
    return {cw: max, ch: Math.max(2, Math.round(vh * (max / vw)))};
  }
  return {cw: Math.max(2, Math.round(vw * (max / vh))), ch: max};
}

export const TRANSCODE_UNSUPPORTED_HINT =
  'This clip uses a format your browser cannot decode or re-encode (often HEVC / “High Efficiency” from an iPhone). On the phone: duplicate or export the video as “Most compatible” / H.264, then upload again. On Windows you can also try another browser or the Microsoft HEVC Video Extensions.';

async function waitForNonZeroVideoDimensions(
  video: HTMLVideoElement,
  timeoutMs: number,
): Promise<void> {
  const start = performance.now();
  while (performance.now() - start < timeoutMs) {
    if (video.videoWidth >= 2 && video.videoHeight >= 2) return;
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  }
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
 * Re-encodes [trimStartSec, trimEndSec] using **canvas.captureStream** + MediaRecorder.
 * More reliable than HTMLVideoElement.captureStream for phone MP4/MOV; scales down to reduce encoder failures.
 * Output is **video-only** (no audio).
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

    if (video.videoWidth < 2 || video.videoHeight < 2) {
      await video.play().catch(() => {
        throw new Error('Could not play this video for trimming.');
      });
      await waitForNonZeroVideoDimensions(video, 6000);
      video.pause();
      await seekTo(video, trimStartSec);
      await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    }

    if (video.videoWidth < 2 || video.videoHeight < 2) {
      throw new Error(TRANSCODE_UNSUPPORTED_HINT);
    }

    const {cw, ch} = canvasSizeForTranscode(video.videoWidth, video.videoHeight);
    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d', {alpha: false, desynchronized: true});
    if (!ctx) {
      throw new Error('Could not create canvas for video processing.');
    }

    const canvasCap = (
      canvas as HTMLCanvasElement & {captureStream?: (fps?: number) => MediaStream}
    ).captureStream;
    if (typeof canvasCap !== 'function') {
      throw new Error('Trimming requires canvas.captureStream (try another browser).');
    }

    const stream = canvasCap.call(canvas, 30);
    const vTracks = stream.getVideoTracks();
    if (vTracks.length === 0) {
      throw new Error('No video track from canvas capture.');
    }

    await video.play().catch(() => {
      throw new Error('Could not play video for trimming — try another clip or browser.');
    });

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
        try {
          ctx.drawImage(video, 0, 0, cw, ch);
        } catch {
          /* ignore single-frame draw errors */
        }
        if (video.currentTime >= end - 0.06 || video.ended) {
          video.pause();
          try {
            ctx.drawImage(video, 0, 0, cw, ch);
          } catch {
            /* ignore */
          }
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
