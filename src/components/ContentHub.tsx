import React, {useState} from 'react';
import type {User} from 'firebase/auth';
import {
  Search,
  LayoutGrid,
  Play,
  Video,
  Trophy,
  Target,
  Activity,
  LogOut,
  Home,
  CircleDot,
  Users,
  Library,
  Shield,
} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {VideoMetadata, VideoCategory, type FeedScope} from '@/src/types';
import {VideoCard} from './VideoCard';
import {motion, AnimatePresence, useReducedMotion} from 'motion/react';

const NBBL_SITE_URL = 'https://nbbl.vercel.app/';
const NBBL_SITE_ORIGIN = NBBL_SITE_URL.replace(/\/$/, '');

interface ContentHubProps {
  feedScope: FeedScope;
  onFeedScopeChange: (scope: FeedScope) => void;
  videos: VideoMetadata[];
  clipsLoading: boolean;
  clipsError: string | null;
  user: User;
  isAdmin: boolean;
  onVideoClick: (video: VideoMetadata) => void;
  onRecordClick: () => void;
  onOpenProfile: () => void;
  onOpenAdmin: () => void;
  onSignOut: () => void;
  /** Clip moderation / visibility update (owner’s library) */
  hubNotice?: string | null;
  onDismissHubNotice?: () => void;
}

export function ContentHub({
  feedScope,
  onFeedScopeChange,
  videos,
  clipsLoading,
  clipsError,
  user,
  isAdmin,
  onVideoClick,
  onRecordClick,
  onOpenProfile,
  onOpenAdmin,
  onSignOut,
  hubNotice,
  onDismissHubNotice,
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
            <a
              href={NBBL_SITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              aria-label="NBBL — opens in a new tab"
            >
              <img
                src="/logo.png"
                alt=""
                className="h-9 w-9 sm:h-10 sm:w-10 object-contain"
              />
            </a>
            <div className="min-w-0">
              <h1 className="font-display text-base sm:text-lg font-black tracking-tight italic truncate leading-tight min-w-0">
                <span className="text-white">NB</span>
                <span className="text-red-600">BL</span>{' '}
                <span className="text-white">ALLNET</span>{' '}
                <span className="text-yellow-400">(Demo)</span>
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 hidden sm:block">
                Basketball remixed
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {isAdmin && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={onOpenAdmin}
                  className="sm:hidden min-h-11 min-w-11 border-yellow-500 bg-yellow-400 text-black hover:bg-yellow-300 hover:border-yellow-400"
                  aria-label="Open admin moderation"
                >
                  <Shield className="h-5 w-5" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onOpenAdmin}
                  className="hidden sm:inline-flex border-yellow-500 bg-yellow-400 text-black hover:bg-yellow-300 hover:border-yellow-400 font-bold uppercase tracking-widest text-[10px] sm:text-xs h-9 px-3 rounded-full"
                >
                  <Shield className="mr-2 h-4 w-4" /> Admin
                </Button>
              </>
            )}
            <Button
              onClick={onRecordClick}
              className="hidden md:inline-flex bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-widest text-[10px] sm:text-xs h-9 px-4 rounded-full"
            >
              <Video className="mr-2 h-4 w-4" /> Record
            </Button>
            <button
              type="button"
              onClick={onOpenProfile}
              className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden shrink-0 ring-offset-2 ring-offset-black focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
              aria-label="Open profile"
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-xs font-bold text-red-500">
                  {(user.displayName || user.email || '?').slice(0, 1).toUpperCase()}
                </div>
              )}
            </button>
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
            src="https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&q=80&w=2000"
            alt=""
            className="h-full w-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-1000 motion-reduce:group-hover:scale-100"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 hero-gradient-nbbl p-4 sm:p-8 flex flex-col justify-end gap-2 sm:gap-4">
            <Badge className="w-fit bg-red-600 text-[10px] font-black uppercase tracking-widest">
              {feedScope === 'mine' ? (
                <span className="font-bold">My Clips</span>
              ) : (
                'Content Hub'
              )}
            </Badge>
            <h2 className="font-display text-2xl sm:text-4xl md:text-5xl font-black tracking-tight uppercase italic leading-none max-w-xl">
              {feedScope === 'mine' ? (
                <>
                  Hoop → <span className="text-red-600">capture</span> →{' '}
                  <span className="text-yellow-400">own</span>
                </>
              ) : (
                <>
                  Run it → <span className="text-red-600">share</span> →{' '}
                  <span className="text-yellow-400">inspire</span>
                </>
              )}
            </h2>
            <div className="max-w-lg space-y-2 sm:space-y-2.5">
              {feedScope === 'mine' ? (
                <>
                  <p className="text-zinc-300 text-xs sm:text-sm font-medium leading-snug">
                    Hands-on preview of NBBL AllNet Demo—see how adding a video clip, My Clips, and the Content Hub
                    work together.
                  </p>
                  <ul className="text-zinc-400 text-xs sm:text-sm font-medium leading-snug list-disc pl-5 space-y-1.5 marker:text-red-600">
                    <li>
                      <span className="font-bold text-zinc-200">Record or upload</span> clips up to 60 seconds (runs,
                      highlights, or training).
                    </li>
                    <li>
                      Clips stay in your private library (<span className="font-bold text-zinc-200">My Clips</span>)
                      unless you opt in to sharing.
                    </li>
                    <li>
                      Check <span className="text-yellow-400 font-semibold">Add to Content Hub</span> when saving or
                      viewing your video clip to request a public listing.
                    </li>
                    <li>
                      Moderators approve all video clips before they are added to the{' '}
                      <span className="font-bold text-zinc-200">Content Hub</span>.
                    </li>
                  </ul>
                </>
              ) : (
                <>
                  <p className="text-zinc-300 text-xs sm:text-sm font-medium leading-snug">
                    The shared reel: basketball moments players chose to put in front of everyone.
                  </p>
                  <ul className="text-zinc-400 text-xs sm:text-sm font-medium leading-snug list-disc pl-5 space-y-1.5 marker:text-red-600">
                    <li>Only moderator-approved clips appear—nothing goes live without a review.</li>
                    <li>Browse runs, highlights, and training from signed-in players.</li>
                    <li>Newest posts first so fresh clips are easy to find.</li>
                  </ul>
                </>
              )}
            </div>
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

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-zinc-900 rounded-full border border-zinc-800 w-full sm:w-auto">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onFeedScopeChange('mine')}
              className={`
                flex-1 sm:flex-none rounded-full px-4 font-bold uppercase tracking-widest text-[10px] h-9 min-h-11 sm:min-h-9
                ${feedScope === 'mine' ? 'bg-red-600 text-white hover:bg-red-600' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}
              `}
            >
              <Library className="mr-1.5 h-3 w-3" />
              My clips
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onFeedScopeChange('community')}
              className={`
                flex-1 sm:flex-none rounded-full px-4 font-bold uppercase tracking-widest text-[10px] h-9 min-h-11 sm:min-h-9
                ${feedScope === 'community' ? 'bg-red-600 text-white hover:bg-red-600' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}
              `}
            >
              <Users className="mr-1.5 h-3 w-3" />
              Content Hub
            </Button>
          </div>
          <p className="text-xs text-zinc-500 sm:text-right sm:max-w-md">
            {feedScope === 'mine' ? (
              <>
                <span className="font-bold text-zinc-400">My Clips</span> is private by default.{' '}
                <span className="font-bold text-zinc-400">Add to Content Hub</span> sends a clip for review before it
                appears for everyone.
              </>
            ) : (
              'Approved clips from all signed-in players — newest first.'
            )}
          </p>
        </div>

        {hubNotice ? (
          <div
            role="status"
            className="flex items-start justify-between gap-3 rounded-xl border border-red-800/50 bg-red-950/40 px-4 py-3 text-sm text-red-100"
          >
            <p className="min-w-0 flex-1 leading-snug">{hubNotice}</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0 min-h-9 text-red-200 hover:text-white hover:bg-red-900/50"
              onClick={() => onDismissHubNotice?.()}
              aria-label="Dismiss notification"
            >
              ×
            </Button>
          </div>
        ) : null}

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
                  ${activeTab === cat.id ? 'bg-red-600 text-white hover:bg-red-600' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}
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
              placeholder={feedScope === 'mine' ? 'Search your clips…' : 'Search Content Hub…'}
              className="w-full min-h-11 bg-zinc-900 border border-zinc-800 rounded-full pl-10 pr-4 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-600/50 transition-all"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {clipsLoading && videos.length === 0 && (
          <p className="text-center text-zinc-500 py-12 text-sm">
            {feedScope === 'mine' ? 'Loading your clips…' : 'Loading Content Hub…'}
          </p>
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
                <VideoCard
                  video={video}
                  onClick={onVideoClick}
                  showModerationState={feedScope === 'mine'}
                  viewerUid={user.uid}
                />
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
              <p className="font-bold text-white">
                {feedScope === 'mine' ? 'No clips yet' : 'No approved clips yet'}
              </p>
              <p className="text-sm mt-1">
                {feedScope === 'mine'
                  ? 'Record a run, highlight, or training session — up to 60 seconds.'
                  : 'When moderators approve clips, they show up here.'}
              </p>
            </div>
            <Button
              className="bg-red-600 hover:bg-red-700 min-h-11"
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

      <footer className="bg-black border-t border-white/10 py-16 px-6 mt-12 pb-24 md:pb-16 mb-2 md:mb-0">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <a
              href={NBBL_SITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 md:gap-3 mb-5 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E70910] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              aria-label="NBBL — opens in a new tab"
            >
              <img
                src="/logo.png"
                alt=""
                width={160}
                height={48}
                className="max-w-[10rem] md:max-w-[11rem] max-h-11 md:max-h-[3.25rem] w-auto h-auto object-contain object-left"
                aria-hidden
              />
              <span className="text-2xl md:text-3xl font-bold tracking-tighter text-white">
                NB<span className="text-[#E70910]">BL</span>
              </span>
            </a>
            <p className="text-zinc-500 max-w-sm text-sm leading-relaxed">
              Changing the culture of basketball by removing the safety net. Join us in the lab and hone your craft.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-4 uppercase tracking-widest text-sm text-white">Menu</h4>
            <ul className="space-y-3 text-sm font-bold uppercase tracking-widest text-zinc-500">
              <li>
                <a
                  href={`${NBBL_SITE_ORIGIN}/#the-game`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#E70910] transition"
                >
                  The Game
                </a>
              </li>
              <li>
                <a
                  href={`${NBBL_SITE_ORIGIN}/#the-ecosystem`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#E70910] transition"
                >
                  The Ecosystem
                </a>
              </li>
              <li>
                <a
                  href={`${NBBL_SITE_ORIGIN}/#the-tech`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#E70910] transition"
                >
                  The Tech
                </a>
              </li>
              <li>
                <a
                  href={`${NBBL_SITE_ORIGIN}/#watch`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#E70910] transition"
                >
                  Watch
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4 uppercase tracking-widest text-sm text-white">Join</h4>
            <a
              href="/"
              className="inline-flex items-center justify-center w-full md:w-auto bg-[#FFE500] px-3 py-2 md:px-6 md:py-2.5 rounded-full font-bold text-xs uppercase tracking-wide text-black hover:opacity-90 transition mb-3"
            >
              Try the demo
            </a>
            <a
              href={`${NBBL_SITE_ORIGIN}/#stay-in-touch`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-col md:flex-row md:items-center md:gap-1 items-center justify-center bg-[#E70910] px-3 py-2 md:px-6 md:py-2.5 rounded-full font-bold text-xs uppercase tracking-wide text-center leading-tight text-white hover:opacity-90 transition mb-8 w-full md:w-auto"
            >
              <span>Join The</span>
              <span>Movement</span>
            </a>
            <h4 className="font-bold mb-4 uppercase tracking-widest text-sm text-white">Connect</h4>
            <div className="flex space-x-4">
              <a
                href="https://www.instagram.com/nobackboards/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 backdrop-blur-md border border-white/10 hover:bg-[#E70910] transition"
                aria-label="Instagram"
              >
                IG
              </a>
              <a
                href="https://www.tiktok.com/@nobackboards"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 backdrop-blur-md border border-white/10 hover:bg-[#E70910] transition"
                aria-label="TikTok"
              >
                TK
              </a>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-white/5 text-xs text-zinc-600 flex flex-col sm:flex-row sm:justify-between gap-2">
          <p className="font-bold uppercase tracking-widest">
            © {new Date().getFullYear()} NO BACKBOARD BASKETBALL LEAGUE. ALL RIGHTS RESERVED.
          </p>
          <p className="font-bold uppercase tracking-widest">DESIGNED FOR THE 1%</p>
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
            className="flex-1 flex flex-col items-center justify-center gap-0.5 text-red-500 text-[10px] uppercase tracking-widest font-bold"
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
