"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPostLoginPath } from "@/lib/user-role";
import { useAuthStore } from "@/stores/auth-store";

const LOGIN_ROLES = [
  { value: "league_admin", label: "League Director", email: "admin@nbbl.local" },
  { value: "coach", label: "Coach", email: "anthony.ray@nbbl.local" },
  { value: "player", label: "Player", email: "marcus.allen@nbbl.local" },
  { value: "fan", label: "Fan", email: "fan@nbbl.local" },
] as const;

type LoginRole = (typeof LOGIN_ROLES)[number]["value"];

export default function LoginPage() {
  const signIn = useAuthStore((s) => s.signIn);
  const loading = useAuthStore((s) => s.loading);
  const [role, setRole] = useState<LoginRole>("league_admin");
  const [email, setEmail] = useState("admin@nbbl.local");
  const [password, setPassword] = useState("PlayCenter123!");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function onRoleChange(nextRole: LoginRole) {
    setRole(nextRole);
    const selected = LOGIN_ROLES.find((item) => item.value === nextRole);
    if (selected) {
      setEmail(selected.email);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await signIn(email, password);
      const user = useAuthStore.getState().user;
      router.replace(getPostLoginPath(user));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-nbbl-sidebar px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image src="/logo.png" alt="NBBL" width={72} height={72} />
          <h1 className="mt-4 text-2xl font-semibold text-gray-900">
            NBBL PlayCenter
          </h1>
          <p className="text-sm text-gray-500">Basketball Experience Cloud</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Role
            </label>
            <select
              className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nbbl-red"
              value={role}
              onChange={(e) => onRoleChange(e.target.value as LoginRole)}
            >
              {LOGIN_ROLES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Email
            </label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Password
            </label>
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-gray-500">
          Emulator password for all roles: PlayCenter123!
        </p>
      </div>
    </div>
  );
}
