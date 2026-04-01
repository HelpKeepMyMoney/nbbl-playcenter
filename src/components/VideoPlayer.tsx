import React from 'react';
import { X, Share2, Heart, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'motion/react';
import { VideoMetadata } from '@/src/types';
import { format } from 'date-fns';

interface VideoPlayerProps {
  video: VideoMetadata;
  onClose: () => void;
}

export function VideoPlayer({ video, onClose }: VideoPlayerProps) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
    >
      <Card className="w-full max-w-4xl bg-zinc-950 border-zinc-800 text-white overflow-hidden shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-800 p-4">
          <div className="flex items-center gap-3">
            <Badge className="bg-orange-600 text-[10px] font-bold uppercase tracking-wider">{video.category}</Badge>
            <CardTitle className="text-lg font-bold tracking-tight">{video.title}</CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="relative aspect-video bg-black">
            <video 
              src={video.videoUrl} 
              controls 
              autoPlay
              className="h-full w-full object-contain"
            />
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <img src="/logo.png" alt="" className="h-10 w-10 object-contain shrink-0" />
                  <div>
                    <p className="text-sm font-bold">Your clip</p>
                    <p className="text-[11px] text-zinc-500">{format(video.createdAt, 'MMMM d, yyyy')}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="border-orange-600/50 text-orange-500 hover:bg-orange-600 hover:text-white">
                  Follow
                </Button>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-zinc-300 leading-relaxed">
                  Your {video.category} clip from NBBL PlayCenter — organized in your private library.
                </p>
                <div className="flex flex-wrap gap-2">
                  {video.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="bg-zinc-900 border-zinc-800 text-zinc-400 text-[10px]">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <Button className="w-full bg-orange-600 hover:bg-orange-700">
                  <Heart className="mr-2 h-4 w-4" /> Like
                </Button>
                <Button variant="outline" className="w-full border-zinc-800 bg-zinc-900 hover:bg-zinc-800">
                  <Share2 className="mr-2 h-4 w-4" /> Share
                </Button>
                <Button variant="outline" className="w-full border-zinc-800 bg-zinc-900 hover:bg-zinc-800">
                  <Download className="mr-2 h-4 w-4" /> Download
                </Button>
              </div>
              
              <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800">
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Stats</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-zinc-500">Views</p>
                    <p className="text-sm font-bold">1.2K</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Duration</p>
                    <p className="text-sm font-bold">{video.duration}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
