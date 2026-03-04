"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { authFetch, clearAuthSession } from "../lib/auth";
import { API_BASE } from "../lib/config";

type AuthUser = {
  first_name?: string;
  last_name?: string;
  username?: string;
  avatar_url?: string;
  credits?: number;
};

export default function Navbar() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const avatarMenuRef = useRef<HTMLDivElement | null>(null);
  
  useEffect(() => {
    const syncAuthUser = async () => {
      try {
        const accessToken = localStorage.getItem("access_token");
        const raw = localStorage.getItem("auth_user");
        const localUser = raw ? (JSON.parse(raw) as AuthUser) : null;
        setAuthUser(localUser);

        if (!accessToken) return;
        const response = await authFetch(`${API_BASE}/api/v1/me/`);

        if (!response.ok) return;
        const remoteUser = (await response.json()) as AuthUser;
        setAuthUser(remoteUser);
        localStorage.setItem("auth_user", JSON.stringify(remoteUser));
      } catch {
        setAuthUser(null);
      }
    };

    void syncAuthUser();
    window.addEventListener("storage", syncAuthUser);
    window.addEventListener("auth-changed", syncAuthUser);

    return () => {
      window.removeEventListener("storage", syncAuthUser);
      window.removeEventListener("auth-changed", syncAuthUser);
    };
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!avatarMenuRef.current) return;
      if (!avatarMenuRef.current.contains(event.target as Node)) {
        setIsAvatarMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const avatarLabel = useMemo(() => {
    const initials = `${authUser?.first_name?.[0] || ""}${authUser?.last_name?.[0] || ""}`.trim();
    if (initials) return initials.toUpperCase();
    return (authUser?.username?.[0] || "U").toUpperCase();
  }, [authUser]);

  const hasAvatar = Boolean(authUser?.avatar_url?.trim());

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem("refresh_token");

    try {
      if (refreshToken) {
        await authFetch(`${API_BASE}/api/v1/logout/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refresh: refreshToken }),
        });
      }
    } catch {
      // Logout should still continue on client cleanup.
    } finally {
      clearAuthSession();
      setAuthUser(null);
      setIsMenuOpen(false);
      setIsAvatarMenuOpen(false);
    }
  };

  const handleCreateWebsite = () => {
    if (!authUser) return;
    router.push("/generate");
  };

  return (
    <motion.header
      className="fixed inset-x-0 top-4 z-50 px-4"
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeIn" }}
    >
      <nav className="nav-shell mx-auto max-w-6xl overflow-visible rounded-2xl px-4 py-3 sm:px-6">
        <div className="relative z-10 flex items-center justify-between gap-4">
          <Link href={authUser ? "/generate" : "/"} className="group flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-orange-300 shadow-[0_0_16px_4px_rgba(251,146,60,0.6)]" />
            <span className="bg-linear-to-r from-orange-300 via-red-300 to-orange-200 bg-clip-text text-base font-bold tracking-[0.12em] text-transparent uppercase transition group-hover:from-orange-200 group-hover:via-red-200 group-hover:to-orange-100 sm:text-lg">
              <img src="/Sgen.png" alt="Sgen Web" className="w-[120px]"/>
            </span>
          </Link>

          <div className="hidden items-center gap-3 md:flex">
            {authUser ? (
              <>
                <span className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white cursor-pointer">
                  <Link href="/pricing" className="block">
                    Credits: {authUser.credits ?? 0}
                  </Link>
                </span>
                <button
                  type="button"
                  onClick={handleCreateWebsite}
                  className="rounded-full bg-gradient-to-r from-orange-400 to-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:from-orange-300 hover:to-red-400"
                >
                  Create New Website
                </button>
                <Link
                  href="/dashboard"
                  className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                >
                  Dashboard
                </Link>
                <div ref={avatarMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setIsAvatarMenuOpen((prev) => !prev)}
                    className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/30 bg-white/10 text-xs font-semibold text-white"
                    aria-label="Open account menu"
                  >
                    {hasAvatar ? (
                      <Image
                        src={authUser.avatar_url as string}
                        alt="User avatar"
                        width={40}
                        height={40}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      avatarLabel
                    )}
                  </button>

                  {isAvatarMenuOpen && (
                    <div className="absolute right-0 z-[120] mt-2 w-40 rounded-xl border border-orange-200/40 bg-red-950/95 p-2 shadow-xl">
                      <Link
                        href="/dashboard"
                        className="block rounded-lg px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                        onClick={() => setIsAvatarMenuOpen(false)}
                      >
                        Account
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-100 transition hover:bg-white/10"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/pricing"
                  className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white/90 transition hover:border-white/35 hover:text-white"
                >
                  Pricing
                </Link>
                <Link
                  href="/?auth=login"
                  className="rounded-full bg-gradient-to-r from-orange-400 to-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:from-orange-300 hover:to-red-400"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 md:hidden">
            {authUser && (
              <button
                type="button"
                onClick={handleCreateWebsite}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-orange-300/70 bg-gradient-to-r from-orange-400 to-red-500 text-xl font-bold text-white cursor-pointer"
                aria-label="Create new website"
              >
                +
              </button>
            )}
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-label="Toggle menu"
            >
              <span className="text-lg leading-none">{isMenuOpen ? "\u2715" : "\u2630"}</span>
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="mt-3 space-y-2 rounded-xl border border-orange-200/20 bg-red-950/75 p-4 md:hidden"
            >
              <div className="grid grid-cols-2 gap-2 pt-2">
                {authUser ? (
                  <>
                    <Link
                      href="/pricing"
                      className="col-span-2 rounded-lg border border-white/20 px-3 py-2 text-center text-sm font-semibold text-white"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Credits: {authUser.credits ?? 0}
                    </Link>
                    <Link
                      href="/generate"
                      className="col-span-2 rounded-lg border border-white/20 px-3 py-2 text-center text-sm font-semibold text-white"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Generate
                    </Link>
                    <Link
                      href="/dashboard"
                      className="col-span-2 rounded-lg border border-white/20 px-3 py-2 text-center text-sm font-semibold text-white"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <button
                      type="button"
                      className="col-span-2 rounded-lg border border-red-300/60 px-3 py-2 text-center text-sm font-semibold text-red-100"
                      onClick={handleLogout}
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/pricing"
                      className="rounded-lg border border-white/20 px-3 py-2 text-center text-sm text-white/90"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Pricing
                    </Link>
                    <Link
                      href="/?auth=login"
                      className="rounded-lg bg-gradient-to-r from-orange-400 to-red-500 px-3 py-2 text-center text-sm font-semibold text-white"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Get Started
                    </Link>
                  </>
                )}
                {authUser && (
                  <div className="col-span-2 inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-center text-sm font-semibold text-white">
                    <span className="inline-flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border border-white/30 bg-white/10 text-[10px]">
                      {hasAvatar ? (
                        <Image
                          src={authUser.avatar_url as string}
                          alt="User avatar"
                          width={24}
                          height={24}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        avatarLabel
                      )}
                    </span>
                    <span>Account</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </motion.header>
  );
}
