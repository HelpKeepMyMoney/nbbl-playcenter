export type VideoCategory = 'run' | 'highlight' | 'training';

export interface VideoMetadata {
  id: string;
  title: string;
  thumbnailUrl: string;
  videoUrl: string;
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
