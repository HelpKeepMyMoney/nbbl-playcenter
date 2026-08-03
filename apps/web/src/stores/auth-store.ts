"use client";

import { create } from "zustand";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { getClientAuth, getClientDb } from "@/lib/firebase";
import { isRecoverableAuthSessionError } from "@/lib/auth-session";
import { provisionCurrentUser } from "@/lib/callables";

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string;
  title?: string;
  tenantId?: string;
  enterpriseId?: string;
  roleKeys?: string[];
  participantId?: string;
  teamId?: string;
  favoriteTeamIds?: string[];
  favoriteParticipantIds?: string[];
  favoriteVideoIds?: string[];
  interestedMerchIds?: string[];
  purchasedMerchIds?: string[];
}

interface AuthState {
  firebaseUser: User | null;
  user: AppUser | null;
  loading: boolean;
  initialized: boolean;
  init: () => () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setFavorites: (favorites: {
    favoriteTeamIds: string[];
    favoriteParticipantIds: string[];
    favoriteVideoIds: string[];
    interestedMerchIds: string[];
    purchasedMerchIds: string[];
  }) => void;
}

async function ensureUserProvisioned(firebaseUser: User): Promise<void> {
  if (process.env.NEXT_PUBLIC_USE_EMULATORS === "true") {
    return;
  }

  const tokenResult = await firebaseUser.getIdTokenResult();
  if (tokenResult.claims.tenantId) {
    return;
  }

  await provisionCurrentUser();
  await firebaseUser.getIdToken(true);
}

function mapProfileToUser(
  firebaseUser: User,
  profile: Record<string, unknown> | undefined
): AppUser {
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName:
      (profile?.displayName as string | undefined) ??
      firebaseUser.displayName ??
      firebaseUser.email ??
      "User",
    title: profile?.title as string | undefined,
    tenantId: profile?.tenantId as string | undefined,
    enterpriseId: profile?.enterpriseId as string | undefined,
    roleKeys: profile?.roleKeys as string[] | undefined,
    participantId: profile?.participantId as string | undefined,
    teamId: profile?.teamId as string | undefined,
    favoriteTeamIds: (profile?.favoriteTeamIds as string[] | undefined) ?? [],
    favoriteParticipantIds:
      (profile?.favoriteParticipantIds as string[] | undefined) ?? [],
    favoriteVideoIds: (profile?.favoriteVideoIds as string[] | undefined) ?? [],
    interestedMerchIds:
      (profile?.interestedMerchIds as string[] | undefined) ?? [],
    purchasedMerchIds:
      (profile?.purchasedMerchIds as string[] | undefined) ?? [],
  };
}

export const useAuthStore = create<AuthState>((set) => ({
  firebaseUser: null,
  user: null,
  loading: false,
  initialized: false,
  init: () => {
    const auth = getClientAuth();
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        set({ firebaseUser: null, user: null, initialized: true });
        return;
      }

      try {
        await ensureUserProvisioned(firebaseUser);
        const profileSnap = await getDoc(
          doc(getClientDb(), "users", firebaseUser.uid)
        );
        const profile = profileSnap.data();
        await firebaseUser.getIdToken(false);
        set({
          firebaseUser,
          user: mapProfileToUser(firebaseUser, profile),
          initialized: true,
        });
      } catch (error) {
        if (isRecoverableAuthSessionError(error)) {
          await signOut(auth);
          set({ firebaseUser: null, user: null, initialized: true });
          return;
        }
        throw error;
      }
    });
    return unsub;
  },
  signIn: async (email, password) => {
    set({ loading: true });
    try {
      const cred = await signInWithEmailAndPassword(
        getClientAuth(),
        email,
        password
      );
      try {
        await cred.user.getIdToken(true);
      } catch (error) {
        if (isRecoverableAuthSessionError(error)) {
          await signOut(getClientAuth());
          return;
        }
        throw error;
      }

      await ensureUserProvisioned(cred.user);

      const profileSnap = await getDoc(
        doc(getClientDb(), "users", cred.user.uid)
      );
      const profile = profileSnap.data();
      set({
        firebaseUser: cred.user,
        user: mapProfileToUser(cred.user, profile),
        initialized: true,
      });
    } finally {
      set({ loading: false });
    }
  },
  signOut: async () => {
    await signOut(getClientAuth());
    set({ firebaseUser: null, user: null });
  },
  setFavorites: (favorites) => {
    set((state) => ({
      user: state.user
        ? {
            ...state.user,
            favoriteTeamIds: favorites.favoriteTeamIds,
            favoriteParticipantIds: favorites.favoriteParticipantIds,
            favoriteVideoIds: favorites.favoriteVideoIds,
            interestedMerchIds: favorites.interestedMerchIds,
            purchasedMerchIds: favorites.purchasedMerchIds,
          }
        : null,
    }));
  },
}));
