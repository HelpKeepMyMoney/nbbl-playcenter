import React, {useState} from 'react';
import type {User} from 'firebase/auth';
import {Search, LayoutGrid, Play, Video, Trophy, Target, Activity, LogOut, Home, CircleDot} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {VideoMetadata, VideoCategory} from '@/src/types';
import {VideoCard} from './VideoCard';
import {motion, AnimatePresence, useReducedMotion} from 'motion/react';

interface ContentHubProps {
  videos: VideoMetadata[];
  clipsLoading: boolean;
  clipsError: string | null;
  user: User;
  onVideoClick: (video: VideoMetadata) => void;
  onRecordClick: () => void;
  onSignOut: () => void;
}

export function ContentHub({
  videos,
  clipsLoading,
  clipsError,
  user,
  onVideoClick,
  onRecordClick,
  onSignOut,
}: ContentHubProps) {
  const reduceMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<VideoCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredVideos = videos.filter(video => {
    const matchesTab = activeTab === 'all' || video.category === activeTab;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      video.title.toLowerCase().includes(q) ||
      video.tags.some(t => t.toLowerCase().includes(q));
    return matchesTab && matchesSearch;
  });

  const categories = [
    {id: 'all' as const, label: 'All', icon: LayoutGrid},
    {id: 'run' as const, label: 'Runs', icon: Activity},
    {id: 'highlight' as const, label: 'Highlights', icon: Trophy},
    {id: 'training' as const, label: 'Training', icon: Target},
  ];

  const listMotion = reduceMotion
    ? {initial: false, animate: {}, exit: {}}
    : {
        initial: {opacity: 0, y: 16},
        animate: {opacity: 1, y: 0},
        exit: {opacity: 0, scale: 0.96},
      };

  return (
    <div className="min-h-dvh bg-black text-white">
      <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-black/90 backdrop-blur-md pt-[env(safe-area-inset-top)]">
        <div className="container mx-auto px-4 h-14 sm:h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-orange-600 flex items-center justify-center shrink-0">
              <span className="text-xs sm:text-sm font-black">NB</span>
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-base sm:text-lg font-black tracking-tight uppercase italic truncate">
                PlayCenter
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 hidden sm:block">
                Basketball remixed
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Button
              onClick={onRecordClick}
              className="hidden md:inline-flex bg-orange-600 hover:bg-orange-700 text-white font-bold uppercase tracking-widest text-[10px] sm:text-xs h-9 px-4 rounded-full"
            >
              <Video className="mr-2 h-4 w-4" /> Record
            </Button>
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden shrink-0">
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-xs font-bold text-orange-500">
                  {(user.displayName || user.email || '?').slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="min-h-11 min-w-11 text-zinc-400 hover:text-white"
              onClick={onSignOut}
              aria-label="Sign out"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 sm:py-8 space-y-6 sm:space-y-8">
        <section className="relative h-[200px] sm:h-[300px] md:h-[380px] rounded-2xl md:rounded-3xl overflow-hidden border border-zinc-800 group">
          <img
            src="https://picsum.photos/seed/nbbl-hero/1200/600"
            alt=""
            className="h-full w-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-1000 motion-reduce:group-hover:scale-100"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent p-4 sm:p-8 flex flex-col justify-end gap-2 sm:gap-4">
            <Badge className="w-fit bg-orange-600 text-[10px] font-black uppercase tracking-widest">Your library</Badge>
            <h2 className="font-display text-2xl sm:text-4xl md:text-5xl font-black tracking-tight uppercase italic leading-none max-w-xl">
              Hoop → <span className="text-orange-600">capture</span> → own
            </h2>
            <p className="text-zinc-400 max-w-lg text-xs sm:text-sm font-medium leading-snug">
              Document runs, highlights, and training. Clips stay private to your account until you choose to
              share more broadly.
            </p>
            <div className="hidden sm:flex gap-3 pt-2">
              <Button
                size="lg"
                className="bg-white text-black hover:bg-zinc-200 font-black uppercase tracking-widest text-[10px] rounded-full px-6"
                onClick={onRecordClick}
              >
                <Play className="mr-2 h-4 w-4 fill-current" /> New clip
              </Button>
            </div>
          </div>
        </section>

        {clipsError && (
          <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
            {clipsError}
          </div>
        )}

        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex items-center gap-1 p-1 bg-zinc-900 rounded-full border border-zinc-800 overflow-x-auto scrollbar-none">
            {categories.map(cat => (
              <Button
                key={cat.id}
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab(cat.id)}
                className={`
                  shrink-0 rounded-full px-3 sm:px-4 font-bold uppercase tracking-widest text-[10px] h-9 min-h-11 sm:min-h-9
                  ${activeTab === cat.id ? 'bg-orange-600 text-white hover:bg-orange-600' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}
                `}
              >
                <cat.icon className="mr-1.5 h-3 w-3" />
                {cat.label}
              </Button>
            ))}
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
            <input
              type="search"
              placeholder="Search your clips…"
              className="w-full min-h-11 bg-zinc-900 border border-zinc-800 rounded-full pl-10 pr-4 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-orange-600/50 transition-all"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {clipsLoading && videos.length === 0 && (
          <p className="text-center text-zinc-500 py-12 text-sm">Loading your clips…</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          <AnimatePresence mode="popLayout">
            {filteredVideos.map(video => (
              <motion.div
                key={video.id}
                layout
                initial={listMotion.initial}
                animate={listMotion.animate}
                exit={listMotion.exit}
                transition={{duration: reduceMotion ? 0 : 0.25}}
              >
                <VideoCard video={video} onClick={onVideoClick} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {!clipsLoading && filteredVideos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500 space-y-4">
            <div className="h-16 w-16 rounded-full bg-zinc-900 flex items-center justify-center">
              <Search className="h-7 w-7" />
            </div>
            <div className="text-center px-4">
              <p className="font-bold text-white">No clips yet</p>
              <p className="text-sm mt-1">Record a run, highlight, or training session — up to 60 seconds.</p>
            </div>
            <Button
              className="bg-orange-600 hover:bg-orange-700 min-h-11"
              onClick={onRecordClick}
            >
              <Video className="mr-2 h-4 w-4" /> Record
            </Button>
            {(searchQuery || activeTab !== 'all') && (
              <Button
                variant="outline"
                className="border-zinc-800 min-h-11"
                onClick={() => {
                  setSearchQuery('');
                  setActiveTab('all');
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-zinc-800 py-10 mt-12 mb-2 md:mb-0">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col items-center md:items-start gap-2 text-center md:text-left">
            <p className="font-display text-sm font-black uppercase italic tracking-tight">No Backboard Basketball League</p>
            <p className="text-zinc-500 text-xs max-w-sm">
              Low tech. Low cost. High impact. Built for the milk crate era remix.
            </p>
          </div>
          <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
            © {new Date().getFullYear()} NBBL
          </p>
        </div>
      </footer>

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-800 bg-black/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
        aria-label="Primary"
      >
        <div className="flex h-14">
          <button
            type="button"
            className="flex-1 flex flex-col items-center justify-center gap-0.5 text-zinc-400 text-[10px] uppercase tracking-widest font-bold"
            onClick={() => window.scrollTo({top: 0, behavior: reduceMotion ? 'auto' : 'smooth'})}
          >
            <Home className="h-5 w-5 text-white" />
            Hub
          </button>
          <button
            type="button"
            className="flex-1 flex flex-col items-center justify-center gap-0.5 text-orange-500 text-[10px] uppercase tracking-widest font-bold"
            onClick={onRecordClick}
          >
            <CircleDot className="h-6 w-6" />
            Record
          </button>
        </div>
      </nav>
    </div>
  );
}
