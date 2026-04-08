/** JPEG placeholder when the browser cannot decode the video (e.g. HEVC) for canvas thumbnail. Neutral art for hub grids — not upload-step messaging. */
export function generatePlaceholderThumbnail(): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const w = 640;
    const h = 360;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Canvas not available'));
      return;
    }
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#0c0c0e');
    g.addColorStop(0.45, '#1c1917');
    g.addColorStop(1, '#292524');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2 - 8;
    const r = 46;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#ea580c';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    const tri = 22;
    ctx.moveTo(cx - tri * 0.35, cy - tri);
    ctx.lineTo(cx - tri * 0.35, cy + tri);
    ctx.lineTo(cx + tri * 0.85, cy);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#a8a29e';
    ctx.font = '600 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('NBBL PlayCenter', cx, h - 52);

    canvas.toBlob(
      blob => {
        if (blob) resolve(blob);
        else reject(new Error('Thumbnail encode failed'));
      },
      'image/jpeg',
      0.88,
    );
  });
}

export function captureThumbnailFromVideoBlob(videoBlob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(videoBlob);
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';

    const cleanup = () => URL.revokeObjectURL(url);

    video.addEventListener('error', () => {
      cleanup();
      reject(new Error('Could not load video for thumbnail'));
    });

    video.addEventListener('loadeddata', () => {
      const t = video.duration && !Number.isNaN(video.duration) ? Math.min(0.2, video.duration / 2) : 0.1;
      try {
        video.currentTime = t;
      } catch {
        cleanup();
        reject(new Error('Could not seek video'));
      }
    });

    video.addEventListener('seeked', () => {
      try {
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (!w || !h) {
          cleanup();
          reject(new Error('Invalid video dimensions'));
          return;
        }
        const canvas = document.createElement('canvas');
        const maxW = 640;
        const scale = w > maxW ? maxW / w : 1;
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup();
          reject(new Error('Canvas not available'));
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          blob => {
            cleanup();
            if (blob) resolve(blob);
            else reject(new Error('Thumbnail encode failed'));
          },
          'image/jpeg',
          0.82,
        );
      } catch (e) {
        cleanup();
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    });

    video.src = url;
  });
}
