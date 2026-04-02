/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {useCallback, useEffect, useRef, useState} from 'react';
import type {User} from 'firebase/auth';
import {ContentHub} from './components/ContentHub';
import {Recorder} from './components/Recorder';
import {SignInScreen} from './components/SignInScreen';
import {VideoPlayer} from './components/VideoPlayer';
import {ProfilePanel} from './components/ProfilePanel';
import {AdminPanel} from './components/AdminPanel';
import {VideoMetadata, type CommunityVisibility, type FeedScope} from './types';
import {AnimatePresence} from 'motion/react';
import {signOutUser, subscribeAuth} from './lib/auth';
import {
  deleteClip,
  setOwnerClipCommunityVisibility,
  subscribeToMyClips,
  subscribeToPublishedCommunityClips,
  uploadClip,
} from './lib/clips';
import {subscribeIsUserAdmin} from './lib/admin';
import {isFirebaseConfigured} from './lib/firebase';
import {upsertUserProfileFromAuth} from './lib/userProfile';

function clipStatusNotice(prev: VideoMetadata, next: VideoMetadata): string | null {
  if (prev.communityVisibility === next.communityVisibility) return null;
  const t = next.title.length > 52 ? `${next.title.slice(0, 52)}…` : next.title;
  const pair = `${prev.communityVisibility}->${next.communityVisibility}`;
  switch (pair) {
    case 'private->pending':
      return `“${t}” was sent for Community review.`;
    case 'pending->published':
      return `“${t}” was approved and is live in Community.`;
    case 'pending->rejected':
      return `“${t}” was not approved${next.moderationRejectionReason ? `: ${next.moderationRejectionReason}` : '.'}`;
    case 'published->private':
      return `“${t}” was removed from Community.`;
    case 'published->pending':
      return `“${t}” is back in review for Community.`;
    case 'rejected->pending':
      return `“${t}” was sent for review again.`;
    case 'rejected->private':
      return `Community status was cleared for “${t}”.`;
    case 'pending->private':
      return `“${t}” was withdrawn from Community review.`;
    default:
      return `“${t}” status was updated.`;
  }
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [myVideos, setMyVideos] = useState<VideoMetadata[]>([]);
  const [myClipsLoading, setMyClipsLoading] = useState(false);
  const [myClipsError, setMyClipsError] = useState<string | null>(null);
  const [communityVideos, setCommunityVideos] = useState<VideoMetadata[]>([]);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [communityError, setCommunityError] = useState<string | null>(null);
  const [feedScope, setFeedScope] = useState<FeedScope>('mine');
  const [isRecorderOpen, setIsRecorderOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoMetadata | null>(null);
  const [hubNotice, setHubNotice] = useState<string | null>(null);
  const hubNoticeInitRef = useRef(false);
  const prevMyVideosRef = useRef<VideoMetadata[]>([]);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setAuthReady(true);
      return;
    }
    return subscribeAuth(u => {
      setUser(u);
      setAuthReady(true);
      if (u && isFirebaseConfigured()) {
        void upsertUserProfileFromAuth(u).catch(err => {
          console.warn('[PlayCenter] Firestore users/{uid} sync failed:', err);
        });
      }
    });
  }, []);

  useEffect(() => {
    if (!user || !isFirebaseConfigured()) {
      setIsAdmin(false);
      return;
    }
    return subscribeIsUserAdmin(user.uid, setIsAdmin);
  }, [user]);

  useEffect(() => {
    if (!user || !isFirebaseConfigured()) {
      setMyVideos([]);
      setMyClipsLoading(false);
      setMyClipsError(null);
      return;
    }
    setMyClipsLoading(true);
    setMyClipsError(null);
    const unsub = subscribeToMyClips(
      user.uid,
      next => {
        setMyVideos(next);
        setMyClipsLoading(false);
        setMyClipsError(null);
      },
      err => {
        setMyClipsError(err.message);
        setMyClipsLoading(false);
      },
    );
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user || !isFirebaseConfigured()) {
      setCommunityVideos([]);
      setCommunityLoading(false);
      setCommunityError(null);
      return;
    }
    setCommunityLoading(true);
    setCommunityError(null);
    const unsub = subscribeToPublishedCommunityClips(
      next => {
        setCommunityVideos(next);
        setCommunityLoading(false);
        setCommunityError(null);
      },
      err => {
        setCommunityError(err.message);
        setCommunityLoading(false);
      },
    );
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user) {
      hubNoticeInitRef.current = false;
      prevMyVideosRef.current = [];
      setHubNotice(null);
      return;
    }
    if (!hubNoticeInitRef.current) {
      hubNoticeInitRef.current = true;
      prevMyVideosRef.current = myVideos;
      return;
    }
    const prev = prevMyVideosRef.current;
    if (prev.length === 0) {
      prevMyVideosRef.current = myVideos;
      return;
    }
    const prevById = new Map<string, VideoMetadata>(
      prev.map(v => [v.id, v] as const),
    );
    for (const v of myVideos) {
      const p = prevById.get(v.id);
      if (!p) {
        if (v.communityVisibility === 'pending') {
          const t = v.title.length > 52 ? `${v.title.slice(0, 52)}…` : v.title;
          setHubNotice(`“${t}” was sent for Community review.`);
          break;
        }
        continue;
      }
      const msg = clipStatusNotice(p, v);
      if (msg) {
        setHubNotice(msg);
        break;
      }
    }
    prevMyVideosRef.current = myVideos;
  }, [myVideos, user]);

  useEffect(() => {
    setSelectedVideo(null);
  }, [feedScope]);

  const displayVideos = feedScope === 'mine' ? myVideos : communityVideos;

  /** Keep the open player’s clip in sync with the hub list (e.g. likeCount after toggling a like). */
  useEffect(() => {
    setSelectedVideo(current => {
      if (!current) return current;
      const fresh = displayVideos.find(v => v.id === current.id);
      return fresh ?? current;
    });
  }, [displayVideos]);
  const displayLoading = feedScope === 'mine' ? myClipsLoading : communityLoading;
  const displayError = feedScope === 'mine' ? myClipsError : communityError;

  const handleDeleteClip = useCallback(
    async (v: VideoMetadata) => {
      if (!user || user.uid !== v.ownerUserId) return;
      const list = feedScope === 'mine' ? myVideos : communityVideos;
      const idx = list.findIndex(x => x.id === v.id);
      const next: VideoMetadata | null =
        list.length <= 1 ? null : idx <= 0 ? list[1]! : list[idx - 1]!;
      await deleteClip(v.ownerUserId, v);
      setSelectedVideo(current => (current?.id === v.id ? next : current));
    },
    [user, feedScope, myVideos, communityVideos],
  );

  const handleSetOwnerCommunityVisibility = useCallback(
    async (clipId: string, next: CommunityVisibility) => {
      await setOwnerClipCommunityVisibility(clipId, next);
    },
    [],
  );

  if (!authReady) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-black text-zinc-500 text-sm">
        Loading…
      </div>
    );
  }

  if (!isFirebaseConfigured() || !user) {
    return <SignInScreen />;
  }

  const viewerIsOwner = selectedVideo ? selectedVideo.ownerUserId === user.uid : false;

  return (
    <div className="min-h-dvh bg-black font-sans selection:bg-orange-600 selection:text-white pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
      <ContentHub
        feedScope={feedScope}
        onFeedScopeChange={setFeedScope}
        videos={displayVideos}
        clipsLoading={displayLoading}
        clipsError={displayError}
        user={user}
        isAdmin={isAdmin}
        onVideoClick={setSelectedVideo}
        onRecordClick={() => setIsRecorderOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onSignOut={() => void signOutUser()}
        hubNotice={hubNotice}
        onDismissHubNotice={() => setHubNotice(null)}
      />

      <AnimatePresence>
        {isRecorderOpen && (
          <Recorder
            onSave={payload =>
              uploadClip(user.uid, {
                ...payload,
                ownerDisplayName:
                  user.displayName?.trim() || user.email || 'Player',
              })
            }
            onClose={() => setIsRecorderOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isProfileOpen && (
          <ProfilePanel user={user} onClose={() => setIsProfileOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAdminOpen && isAdmin && (
          <AdminPanel moderatorUid={user.uid} onClose={() => setIsAdminOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedVideo && (
          <VideoPlayer
            video={selectedVideo}
            videos={displayVideos}
            onSelectVideo={setSelectedVideo}
            onClose={() => setSelectedVideo(null)}
            viewerIsOwner={viewerIsOwner}
            onSetOwnerCommunityVisibility={handleSetOwnerCommunityVisibility}
            onDeleteClip={handleDeleteClip}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
