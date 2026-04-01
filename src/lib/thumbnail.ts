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
