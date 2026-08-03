"use client";

import { getClientAuth } from "@/lib/firebase";

export async function callFunction<TInput, TOutput>(
  name: string,
  data: TInput
): Promise<TOutput> {
  if (process.env.NEXT_PUBLIC_USE_EMULATORS === "true") {
    const { httpsCallable } = await import("firebase/functions");
    const { getClientFunctions } = await import("@/lib/firebase");
    const fn = httpsCallable<TInput, TOutput>(getClientFunctions(), name);
    const result = await fn(data);
    return result.data;
  }

  const token = await getClientAuth().currentUser?.getIdToken();
  if (!token) {
    throw new Error("Authentication required");
  }

  const response = await fetch(`/api/commands/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Request failed");
  }

  return payload as TOutput;
}

export async function provisionCurrentUser(): Promise<{ provisioned: boolean }> {
  const token = await getClientAuth().currentUser?.getIdToken();
  if (!token) {
    throw new Error("Authentication required");
  }

  const response = await fetch("/api/auth/provision", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Provisioning failed");
  }

  return payload as { provisioned: boolean };
}
