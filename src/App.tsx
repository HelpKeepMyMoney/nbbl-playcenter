/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {useEffect, useState} from 'react';
import type {User} from 'firebase/auth';
import {ContentHub} from './components/ContentHub';
import {Recorder} from './components/Recorder';
import {SignInScreen} from './components/SignInScreen';
import {VideoPlayer} from './components/VideoPlayer';
import {VideoMetadata} from './types';
import {AnimatePresence} from 'motion/react';
import {signOutUser, subscribeAuth} from './lib/auth';
import {subscribeToMyClips, uploadClip} from './lib/clips';
import {isFirebaseConfigured} from './lib/firebase';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [videos, setVideos] = useState<VideoMetadata[]>([]);
  const [clipsLoading, setClipsLoading] = useState(false);
  const [clipsError, setClipsError] = useState<string | null>(null);
  const [isRecorderOpen, setIsRecorderOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoMetadata | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setAuthReady(true);
      return;
    }
    return subscribeAuth(u => {
      setUser(u);
      setAuthReady(true);
    });
  }, []);

  useEffect(() => {
    if (!user || !isFirebaseConfigured()) {
      setVideos([]);
      setClipsLoading(false);
      setClipsError(null);
      return;
    }
    setClipsLoading(true);
    setClipsError(null);
    const unsub = subscribeToMyClips(
      user.uid,
      next => {
        setVideos(next);
        setClipsLoading(false);
        setClipsError(null);
      },
      err => {
        setClipsError(err.message);
        setClipsLoading(false);
      },
    );
    return unsub;
  }, [user]);

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

  return (
    <div className="min-h-dvh bg-black font-sans selection:bg-orange-600 selection:text-white pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
      <ContentHub
        videos={videos}
        clipsLoading={clipsLoading}
        clipsError={clipsError}
        user={user}
        onVideoClick={setSelectedVideo}
        onRecordClick={() => setIsRecorderOpen(true)}
        onSignOut={() => void signOutUser()}
      />

      <AnimatePresence>
        {isRecorderOpen && (
          <Recorder
            onSave={payload => uploadClip(user.uid, payload)}
            onClose={() => setIsRecorderOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedVideo && (
          <VideoPlayer
            video={selectedVideo}
            videos={videos}
            onSelectVideo={setSelectedVideo}
            onClose={() => setSelectedVideo(null)}
            userLabel={user.displayName || user.email || 'You'}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
