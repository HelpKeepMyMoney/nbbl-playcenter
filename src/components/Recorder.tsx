import React, {useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo} from 'react';
import {Camera, StopCircle, Save, X, Trash2, SwitchCamera, Upload, Scissors} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle, CardDescription} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {motion} from 'motion/react';
import {VideoCategory} from '@/src/types';
import type {ClipUploadPayload} from '@/src/lib/clips';
import {formatDurationSec} from '@/src/lib/duration';
import {captureThumbnailFromVideoBlob} from '@/src/lib/thumbnail';
import {
  MAX_CLIP_DURATION_SEC,
  MAX_VIDEO_BYTES,
  prepareClipForUpload,
  readDurationSecFromVideoBlob,
  canSkipCameraTranscode,
  TRANSCODE_UNSUPPORTED_HINT,
} from '@/src/lib/videoProcess';

const MAX_RECORD_MS = MAX_CLIP_DURATION_SEC * 1000;

function isLikelyVideoFile(file: File): boolean {
  if (file.type.startsWith('video/')) return true;
  // Some mobile pickers omit MIME type; accept common extensions only.
  if (file.type !== '' && file.type !== 'application/octet-stream') return false;
  return /\.(mp4|m4v|mov|webm|mkv|3gp|avi)$/i.test(file.name);
}

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

type ClipSource = 'camera' | 'library';

interface RecorderProps {
  onSave: (payload: ClipUploadPayload) => Promise<void>;
  onClose: () => void;
}

export function Recorder({onSave, onClose}: RecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [clipSource, setClipSource] = useState<ClipSource>('camera');
  const [category, setCategory] = useState<VideoCategory>('run');
  const [title, setTitle] = useState('');
  const [remainingMs, setRemainingMs] = useState(MAX_RECORD_MS);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [makePublic, setMakePublic] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [fullDurationSec, setFullDurationSec] = useState<number | null>(null);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(MAX_CLIP_DURATION_SEC);
  const [durationLoading, setDurationLoading] = useState(false);
  /** Bumped on each new capture/upload so preview <video> key stays unique even if blob size matches a prior clip. */
  const [previewGeneration, setPreviewGeneration] = useState(0);
  const [previewDecodeNote, setPreviewDecodeNote] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recordStartRef = useRef<number>(0);
  const recordedDurationSecRef = useRef<number | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previewObjectUrlRef = useRef<string | null>(null);

  const revokePreview = useCallback(() => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (recordedBlob) return;
    let cancelled = false;
    async function setupCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {facingMode},
          audio: true,
        });
        if (cancelled) {
          mediaStream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setCameraReady(true);
      } catch (err) {
        console.error('Error accessing camera:', err);
        setCameraReady(false);
      }
    }
    void setupCamera();
    return () => {
      cancelled = true;
      setCameraReady(false);
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      revokePreview();
    };
  }, [facingMode, revokePreview, recordedBlob]);

  // Attach object URL synchronously after the preview <video> mounts — useEffect can run before
  // the ref exists, which left library uploads with a blank player while duration still loaded.
  useLayoutEffect(() => {
    if (!recordedBlob) {
      revokePreview();
      previewVideoRef.current?.removeAttribute('src');
      return;
    }

    let cancelled = false;
    let rafId = 0;
    let attempts = 0;
    const maxAttempts = 24;

    const attach = () => {
      if (cancelled) return;
      const el = previewVideoRef.current;
      if (el) {
        revokePreview();
        if (cancelled) return;
        const u = URL.createObjectURL(recordedBlob);
        previewObjectUrlRef.current = u;
        el.src = u;
        return;
      }
      if (attempts++ < maxAttempts) {
        rafId = requestAnimationFrame(attach);
      }
    };

    attach();
    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [recordedBlob, revokePreview]);

  /** Remount preview <video> per blob so the element never keeps stale decode state from a prior clip. */
  const previewVideoKey = useMemo(
    () =>
      recordedBlob
        ? `p${previewGeneration}-${clipSource}-${recordedBlob.size}-${recordedBlob instanceof File ? recordedBlob.lastModified : 'b'}`
        : 'live',
    [recordedBlob, clipSource, previewGeneration],
  );

  useEffect(() => {
    if (!recordedBlob) {
      setPreviewDecodeNote(null);
      return;
    }
    const el = previewVideoRef.current;
    if (!el?.src) return;
    let cancelled = false;

    const check = () => {
      if (cancelled) return;
      if (el.videoWidth >= 2 && el.videoHeight >= 2) {
        setPreviewDecodeNote(null);
        return;
      }
      if (el.error) {
        setPreviewDecodeNote(TRANSCODE_UNSUPPORTED_HINT);
        return;
      }
      setPreviewDecodeNote(
        'If the preview stays black, this browser may not decode your file (often HEVC from iPhone on Windows). Trim/save re-encodes in the browser — if that fails too, export the clip as H.264 / “Most compatible” and upload again.',
      );
    };

    el.addEventListener('loadeddata', check, {once: true});
    el.addEventListener('error', check, {once: true});
    const tid = window.setTimeout(check, 3200);
    return () => {
      cancelled = true;
      clearTimeout(tid);
      el.removeEventListener('loadeddata', check);
      el.removeEventListener('error', check);
    };
  }, [recordedBlob, previewVideoKey]);

  useEffect(() => {
    if (!recordedBlob) {
      setFullDurationSec(null);
      setTrimStart(0);
      setTrimEnd(MAX_CLIP_DURATION_SEC);
      setDurationLoading(false);
      return;
    }
    let cancelled = false;
    setDurationLoading(true);
    void (async () => {
      try {
        let dur: number;
        if (clipSource === 'camera' && recordedDurationSecRef.current != null) {
          dur = recordedDurationSecRef.current;
        } else {
          dur = await readDurationSecFromVideoBlob(recordedBlob, 7200);
        }
        if (cancelled) return;
        const cap = Math.min(Math.max(dur, 0.25), MAX_CLIP_DURATION_SEC);
        setFullDurationSec(dur);
        setTrimStart(0);
        setTrimEnd(Math.min(dur, MAX_CLIP_DURATION_SEC));
      } catch {
        if (!cancelled) {
          setFullDurationSec(MAX_CLIP_DURATION_SEC);
          setTrimStart(0);
          setTrimEnd(MAX_CLIP_DURATION_SEC);
        }
      } finally {
        if (!cancelled) setDurationLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [recordedBlob, clipSource]);

  const clearRecordTimer = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    clearRecordTimer();
  }, []);

  const startRecording = () => {
    const stream = streamRef.current;
    if (!stream) return;

    chunksRef.current = [];
    recordedDurationSecRef.current = null;
    const mime = pickRecorderMimeType();
    const mediaRecorder = mime
      ? new MediaRecorder(stream, {mimeType: mime})
      : new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blobType = mime || 'video/webm';
      const blob = new Blob(chunksRef.current, {type: blobType});
      const elapsedMs = Date.now() - recordStartRef.current;
      recordedDurationSecRef.current = Math.min(
        Math.max(0, elapsedMs / 1000),
        MAX_RECORD_MS / 1000,
      );
      setClipSource('camera');
      setPreviewGeneration(g => g + 1);
      setRecordedBlob(blob);
    };

    recordStartRef.current = Date.now();
    mediaRecorder.start(200);
    setRemainingMs(MAX_RECORD_MS);
    setIsRecording(true);

    clearRecordTimer();
    tickRef.current = setInterval(() => {
      const elapsed = Date.now() - recordStartRef.current;
      const left = Math.max(0, MAX_RECORD_MS - elapsed);
      setRemainingMs(left);
      if (elapsed >= MAX_RECORD_MS) {
        stopRecording();
      }
    }, 100);
  };

  const discardRecording = () => {
    revokePreview();
    recordedDurationSecRef.current = null;
    setRecordedBlob(null);
    setUploadError(null);
    setMakePublic(false);
    setClipSource('camera');
    setFullDurationSec(null);
    setPreviewDecodeNote(null);
  };

  const onPickLibraryVideo = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!isLikelyVideoFile(file)) {
      setUploadError('Please choose a video file.');
      return;
    }
    setUploadError(null);
    setClipSource('library');
    setPreviewDecodeNote(null);
    setPreviewGeneration(g => g + 1);
    setRecordedBlob(file);
  }, []);

  const handleSave = async () => {
    if (!recordedBlob || uploading) return;
    setUploadError(null);
    setUploading(true);
    try {
      const fullDur =
        fullDurationSec ??
        (await readDurationSecFromVideoBlob(recordedBlob, 7200));
      const t0 = Math.max(0, Math.min(trimStart, fullDur - 0.25));
      const t1 = Math.max(t0 + 0.25, Math.min(trimEnd, fullDur));

      let videoBlob: Blob;
      let durationSec: number;

      const skipTranscode =
        clipSource === 'camera' &&
        canSkipCameraTranscode(recordedBlob, t0, t1, fullDur);

      if (skipTranscode) {
        videoBlob = recordedBlob;
        durationSec = Math.min(t1 - t0, MAX_CLIP_DURATION_SEC);
      } else {
        setUploadError(null);
        const prepared = await prepareClipForUpload(recordedBlob, t0, t1);
        videoBlob = prepared.blob;
        durationSec = prepared.durationSec;
      }

      if (videoBlob.size > MAX_VIDEO_BYTES) {
        throw new Error('Video is still over 20 MB. Trim a shorter segment.');
      }

      const thumbnailBlob = await captureThumbnailFromVideoBlob(videoBlob);
      await onSave({
        videoBlob,
        thumbnailBlob,
        durationSec,
        title: title.trim() || `NBBL ${category.toUpperCase()} — ${new Date().toLocaleDateString()}`,
        category,
        tags: ['NBBL', category],
        requestCommunityPublic: makePublic,
      });
      onClose();
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (isRecording) stopRecording();
    onClose();
  };

  const remainingLabel = formatDurationSec(Math.ceil(remainingMs / 1000));

  const trimMaxEnd =
    fullDurationSec != null ? Math.min(fullDurationSec, MAX_CLIP_DURATION_SEC) : MAX_CLIP_DURATION_SEC;
  const trimUiReady = fullDurationSec != null && !durationLoading;

  return (
    <motion.div
      initial={{opacity: 0, scale: 0.95}}
      animate={{opacity: 1, scale: 1}}
      exit={{opacity: 0, scale: 0.95}}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-4 backdrop-blur-sm"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="sr-only"
        onChange={onPickLibraryVideo}
      />
      <Card className="w-full max-w-2xl max-h-[100dvh] sm:max-h-[95dvh] overflow-y-auto rounded-t-2xl sm:rounded-xl bg-zinc-900 border-zinc-800 text-white border-x-0 sm:border-x border-b-0 sm:border-b">
        <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-800 shrink-0">
          <div>
            <CardTitle className="font-display text-lg sm:text-xl tracking-tight uppercase">
              Record or upload
            </CardTitle>
            <CardDescription className="text-zinc-400 text-xs sm:text-sm">
              Up to 60s — trim, then we compress to under 20 MB
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="min-h-11 min-w-11 text-zinc-400 hover:text-white shrink-0"
            aria-label="Close recorder"
          >
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          <div className="relative aspect-video bg-black">
            {!recordedBlob ? (
              <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
            ) : (
              <video
                key={previewVideoKey}
                ref={previewVideoRef}
                controls
                playsInline
                preload="metadata"
                className="h-full w-full object-cover"
              />
            )}

            {!recordedBlob && !isRecording && (
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute top-3 right-3 min-h-11 min-w-11 bg-black/70 border border-zinc-600 text-white hover:bg-black/90"
                onClick={() =>
                  setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'))
                }
                disabled={!cameraReady}
                aria-label={
                  facingMode === 'environment'
                    ? 'Switch to front-facing camera'
                    : 'Switch to rear-facing camera'
                }
              >
                <SwitchCamera className="h-5 w-5" />
              </Button>
            )}

            {isRecording && (
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-600 animate-pulse" />
                  <Badge variant="destructive" className="font-mono text-[10px]">
                    REC
                  </Badge>
                </div>
                <Badge
                  variant="secondary"
                  className="font-mono text-sm bg-black/80 text-white border-zinc-700"
                >
                  {remainingLabel}
                </Badge>
              </div>
            )}

            {recordedBlob && previewDecodeNote ? (
              <div className="absolute inset-x-0 bottom-0 p-3 bg-black/85 border-t border-zinc-800">
                <p className="text-[11px] sm:text-xs text-amber-100/95 leading-snug text-center">
                  {previewDecodeNote}
                </p>
              </div>
            ) : null}

          </div>

          <div className="p-4 sm:p-6 space-y-6 safe-pad-bottom">
            {!recordedBlob ? (
              <div className="flex flex-col items-center gap-4">
                <div className="flex flex-wrap justify-center gap-2">
                  {(['run', 'highlight', 'training'] as VideoCategory[]).map(cat => (
                    <Button
                      key={cat}
                      variant={category === cat ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCategory(cat)}
                      className={`min-h-11 px-4 ${category === cat ? 'bg-orange-600 hover:bg-orange-700' : 'border-zinc-700 text-zinc-400'}`}
                    >
                      {cat.toUpperCase()}
                    </Button>
                  ))}
                </div>

                <div className="flex flex-wrap justify-center gap-3 w-full">
                  <Button
                    size="lg"
                    variant="outline"
                    className="min-h-12 border-zinc-600 bg-zinc-950 hover:bg-zinc-800"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isRecording}
                  >
                    <Upload className="mr-2 h-5 w-5" />
                    From camera roll
                  </Button>
                  <Button
                    size="lg"
                    className={`min-h-[3.5rem] min-w-[3.5rem] h-14 w-14 rounded-full ${isRecording ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-red-600 hover:bg-red-700'}`}
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={!cameraReady}
                    aria-label={isRecording ? 'Stop recording' : 'Start recording'}
                  >
                    {isRecording ? <StopCircle className="h-8 w-8" /> : <Camera className="h-8 w-8" />}
                  </Button>
                </div>
                <p className="text-sm text-zinc-500 text-center px-4">
                  {isRecording
                    ? 'Tap to stop — max 60 seconds'
                    : cameraReady
                      ? 'Record in app or upload a video to trim'
                      : 'Allow camera access to record'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
                    <Scissors className="h-3.5 w-3.5" />
                    Trim clip
                  </div>
                  {durationLoading ? (
                    <p className="text-sm text-zinc-500">Reading duration…</p>
                  ) : trimUiReady ? (
                    <>
                      <p className="text-[11px] text-zinc-500">
                        Source length {formatDurationSec(Math.floor(fullDurationSec))} — exported segment
                        max {MAX_CLIP_DURATION_SEC}s, file cap 20 MB.
                      </p>
                      <div className="space-y-2">
                        <label className="text-xs text-zinc-400 flex justify-between">
                          <span>Start</span>
                          <span className="font-mono text-zinc-300">{formatDurationSec(Math.floor(trimStart))}</span>
                        </label>
                        <input
                          type="range"
                          className="w-full accent-orange-600"
                          min={0}
                          max={Math.max(0, trimMaxEnd - 0.25)}
                          step={0.1}
                          value={Math.min(trimStart, trimMaxEnd - 0.25)}
                          onChange={e => {
                            const v = Number(e.target.value);
                            setTrimStart(v);
                            setTrimEnd(te => Math.max(v + 0.25, Math.min(te, trimMaxEnd)));
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-zinc-400 flex justify-between">
                          <span>End</span>
                          <span className="font-mono text-zinc-300">{formatDurationSec(Math.floor(trimEnd))}</span>
                        </label>
                        <input
                          type="range"
                          className="w-full accent-orange-600"
                          min={Math.min(trimMaxEnd, trimStart + 0.25)}
                          max={trimMaxEnd}
                          step={0.1}
                          value={Math.max(trimStart + 0.25, Math.min(trimEnd, trimMaxEnd))}
                          onChange={e => {
                            const v = Number(e.target.value);
                            setTrimEnd(v);
                            setTrimStart(ts => Math.min(ts, v - 0.25));
                          }}
                        />
                      </div>
                    </>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">Title</label>
                  <input
                    type="text"
                    placeholder="Name this clip…"
                    className="w-full min-h-11 bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-600"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                  />
                </div>
                <label className="flex items-start gap-3 p-3 rounded-lg border border-zinc-800 bg-zinc-950/50 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-zinc-600 text-orange-600 focus:ring-orange-600 shrink-0"
                    checked={makePublic}
                    disabled={uploading}
                    onChange={e => setMakePublic(e.target.checked)}
                  />
                  <span className="text-sm text-zinc-300">
                    <span className="font-medium text-white">Request Community</span>
                    <span className="block text-xs text-zinc-500 mt-1">
                      Sends your clip for moderator review. It appears in Community only after approval.
                    </span>
                  </span>
                </label>
                {uploadError && <p className="text-sm text-red-400">{uploadError}</p>}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    className="flex-1 min-h-12 bg-orange-600 hover:bg-orange-700"
                    onClick={() => void handleSave()}
                    disabled={uploading || durationLoading || !trimUiReady}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {uploading ? 'Processing…' : 'Save to hub'}
                  </Button>
                  <Button
                    variant="outline"
                    className="min-h-12 border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                    onClick={discardRecording}
                    disabled={uploading}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Discard
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
