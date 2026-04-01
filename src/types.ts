export type VideoCategory = 'run' | 'highlight' | 'training';

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
}

export interface User {
  id: string;
  name: string;
  avatar: string;
}
