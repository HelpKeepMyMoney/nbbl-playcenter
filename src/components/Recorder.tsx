import React, {useState, useRef, useEffect, useCallback} from 'react';
import {Camera, StopCircle, Save, X, Trash2, SwitchCamera} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle, CardDescription} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {motion} from 'motion/react';
import {VideoCategory} from '@/src/types';
import type {ClipUploadPayload} from '@/src/lib/clips';
import {formatDurationSec} from '@/src/lib/duration';
import {captureThumbnailFromVideoBlob} from '@/src/lib/thumbnail';

const MAX_RECORD_MS = 60_000;

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

interface RecorderProps {
  onSave: (payload: ClipUploadPayload) => Promise<void>;
  onClose: () => void;
}

export function Recorder({onSave, onClose}: RecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [category, setCategory] = useState<VideoCategory>('run');
  const [title, setTitle] = useState('');
  const [remainingMs, setRemainingMs] = useState(MAX_RECORD_MS);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  /** Rear camera on phones (`environment`); `user` is selfie / front. */
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recordStartRef = useRef<number>(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previewObjectUrlRef = useRef<string | null>(null);

  const revokePreview = useCallback(() => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
  }, []);

  const setPreviewFromBlob = useCallback(
    (blob: Blob | null) => {
      revokePreview();
      if (!blob || !previewVideoRef.current) return;
      const u = URL.createObjectURL(blob);
      previewObjectUrlRef.current = u;
      previewVideoRef.current.src = u;
    },
    [revokePreview],
  );

  useEffect(() => {
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
    setupCamera();
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
  }, [facingMode, revokePreview]);

  useEffect(() => {
    if (recordedBlob) {
      setPreviewFromBlob(recordedBlob);
    } else {
      revokePreview();
      if (previewVideoRef.current) previewVideoRef.current.removeAttribute('src');
    }
  }, [recordedBlob, setPreviewFromBlob, revokePreview]);

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
      setRecordedBlob(blob);
    };

    mediaRecorder.start(200);
    recordStartRef.current = Date.now();
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
    setRecordedBlob(null);
    setUploadError(null);
  };

  const readDurationSec = (blob: Blob): Promise<number> => {
    return new Promise(resolve => {
      const url = URL.createObjectURL(blob);
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.src = url;
      v.addEventListener('loadedmetadata', () => {
        const d = v.duration;
        URL.revokeObjectURL(url);
        resolve(Number.isFinite(d) ? d : MAX_RECORD_MS / 1000);
      });
      v.addEventListener('error', () => {
        URL.revokeObjectURL(url);
        resolve(MAX_RECORD_MS / 1000);
      });
    });
  };

  const handleSave = async () => {
    if (!recordedBlob || uploading) return;
    setUploadError(null);
    setUploading(true);
    try {
      const durationSec = await readDurationSec(recordedBlob);
      const thumbnailBlob = await captureThumbnailFromVideoBlob(recordedBlob);
      const trimmedDuration = Math.min(durationSec, MAX_RECORD_MS / 1000);
      await onSave({
        videoBlob: recordedBlob,
        thumbnailBlob,
        durationSec: trimmedDuration,
        title: title.trim() || `NBBL ${category.toUpperCase()} — ${new Date().toLocaleDateString()}`,
        category,
        tags: ['NBBL', category],
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

  return (
    <motion.div
      initial={{opacity: 0, scale: 0.95}}
      animate={{opacity: 1, scale: 1}}
      exit={{opacity: 0, scale: 0.95}}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-4 backdrop-blur-sm"
    >
      <Card className="w-full max-w-2xl max-h-[100dvh] sm:max-h-[95dvh] overflow-y-auto rounded-t-2xl sm:rounded-xl bg-zinc-900 border-zinc-800 text-white border-x-0 sm:border-x border-b-0 sm:border-b">
        <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-800 shrink-0">
          <div>
            <CardTitle className="font-display text-lg sm:text-xl tracking-tight uppercase">
              Record clip
            </CardTitle>
            <CardDescription className="text-zinc-400 text-xs sm:text-sm">
              Up to 60s — runs, highlights, or training
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
                ref={previewVideoRef}
                controls
                playsInline
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

                <Button
                  size="lg"
                  className={`min-h-[3.5rem] min-w-[3.5rem] h-14 w-14 rounded-full ${isRecording ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-red-600 hover:bg-red-700'}`}
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={!cameraReady}
                  aria-label={isRecording ? 'Stop recording' : 'Start recording'}
                >
                  {isRecording ? <StopCircle className="h-8 w-8" /> : <Camera className="h-8 w-8" />}
                </Button>
                <p className="text-sm text-zinc-500 text-center px-4">
                  {isRecording
                    ? 'Tap to stop — max 60 seconds'
                    : cameraReady
                      ? 'Tap to record (60s max)'
                      : 'Allow camera access to record'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
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
                {uploadError && <p className="text-sm text-red-400">{uploadError}</p>}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    className="flex-1 min-h-12 bg-orange-600 hover:bg-orange-700"
                    onClick={() => void handleSave()}
                    disabled={uploading}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {uploading ? 'Uploading…' : 'Save to hub'}
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
