export type VideoCategory = 'run' | 'highlight' | 'training';

export interface VideoMetadata {
  id: string;
  title: string;
  thumbnailUrl: string;
  videoUrl: string;
  duration: string;
  createdAt: Date;
  category: VideoCategory;
  tags: string[];
}

export interface User {
  id: string;
  name: string;
  avatar: string;
}
