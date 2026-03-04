"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { API_BASE } from "../lib/config";

gsap.registerPlugin(useGSAP);

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
            auto_select?: boolean;
            use_fedcm_for_prompt?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              shape?: "rectangular" | "pill" | "circle" | "square";
              width?: number;
            }
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ??
  "912635235048-7jj1ca4969vj1u2i8eoh18boatms8hke.apps.googleusercontent.com";

type AuthResponse = {
  access: string;
  refresh: string;
  user?: unknown;
};

export default function AuthModal() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isOpen = searchParams.get("auth") === "login";
  const modalRef = useRef<HTMLDivElement | null>(null);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useGSAP(
    () => {
      if (!isOpen) return;
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.fromTo(".auth-backdrop", { opacity: 0 }, { opacity: 1, duration: 0.2 }).fromTo(
        ".auth-panel",
        { y: 28, opacity: 0, scale: 0.95, filter: "blur(6px)" },
        { y: 0, opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.45 },
        "-=0.05"
      );
    },
    { dependencies: [isOpen], scope: modalRef }
  );

  const closeModal = () => {
    router.replace(pathname || "/");
  };

  const saveSession = (data: AuthResponse) => {
    localStorage.setItem("access_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);
    if (data.user) {
      localStorage.setItem("auth_user", JSON.stringify(data.user));
    }
    window.dispatchEvent(new Event("auth-changed"));
  };

  const handleGoogleCredential = async (credential?: string) => {
    if (!credential) {
      setStatus("error");
      setMessage("Google sign-in failed. No credential returned.");
      return;
    }

    try {
      setStatus("loading");
      setMessage("Verifying Google account...");

      const response = await fetch(`${API_BASE}/api/v1/google/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_token: credential }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || "Google login failed.");
      }

      saveSession(data);
      setStatus("success");
      setMessage("Signed in successfully.");
      setTimeout(closeModal, 600);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to complete Google login.");
    }
  };

  const onGoogleScriptLoad = () => {
    if (!isOpen || !googleButtonRef.current) return;
    if (!GOOGLE_CLIENT_ID) {
      setStatus("error");
      setMessage("Google client ID missing.");
      return;
    }

    if (!window.google?.accounts?.id) {
      setStatus("error");
      setMessage("Google Sign-In SDK failed to initialize.");
      return;
    }

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => {
        void handleGoogleCredential(response.credential);
      },
      auto_select: false,
      use_fedcm_for_prompt: true,
    });

    googleButtonRef.current.innerHTML = "";
    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "pill",
      width: 340,
    });
    window.google.accounts.id.prompt();
  };

  const handleManualSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!identifier || !password) {
      setStatus("error");
      setMessage("Enter username/email and password.");
      return;
    }

    try {
      setStatus("loading");
      setMessage("Signing in...");

      const response = await fetch(`${API_BASE}/api/v1/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: identifier,
          password,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        const detail = (data?.detail || "Manual login failed.") as string;
        const shouldAutoRegister =
          identifier.includes("@") && detail.toLowerCase().includes("no active account");

        if (!shouldAutoRegister) {
          throw new Error(detail);
        }

        setMessage("No account found. Creating your account...");
        const registerResponse = await fetch(`${API_BASE}/api/v1/register/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: identifier,
            password,
          }),
        });

        const registerData = await registerResponse.json();
        if (!registerResponse.ok) {
          throw new Error(registerData?.detail || "Registration failed.");
        }

        saveSession(registerData);
        setStatus("success");
        setMessage("Account created and signed in.");
        setTimeout(closeModal, 600);
        return;
      }

      saveSession(data);
      setStatus("success");
      setMessage("Signed in successfully.");
      setTimeout(closeModal, 600);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to complete manual login.");
    }
  };

  if (!isOpen) return null;

  return (
    <div ref={modalRef} className="fixed inset-0 z-[80] flex items-center justify-center px-4">
      <Script src="https://accounts.google.com/gsi/client" async defer onLoad={onGoogleScriptLoad} />

      <button
        type="button"
        className="auth-backdrop absolute inset-0 bg-red-950/45 backdrop-blur-[2px]"
        onClick={closeModal}
        aria-label="Close login modal"
      />

      <div className="auth-panel relative w-full max-w-md rounded-3xl border border-orange-200/65 bg-white/85 p-6 shadow-[0_28px_70px_rgba(127,29,29,0.35)] backdrop-blur-xl sm:p-7">
        <button
          type="button"
          onClick={closeModal}
          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-orange-200 bg-white text-sm font-semibold text-gray-600 transition hover:border-orange-300 hover:text-gray-900"
          aria-label="Close"
        >
          ✕
        </button>

        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">Welcome</p>
        <h2 className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">Login to continue</h2>
        <p className="mt-2 text-sm text-gray-700">Use manual login or continue with Google.</p>

        <form className="mt-6 space-y-3" onSubmit={handleManualSubmit}>
          <input
            type="text"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder="Username or email"
            className="w-full rounded-xl border border-orange-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-400"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            className="w-full rounded-xl border border-orange-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-400"
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-orange-400 to-red-500 px-4 py-3 text-sm font-semibold text-white transition hover:from-orange-300 hover:to-red-400"
          >
            Login (Manual)
          </button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-orange-200" />
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-orange-500">or</span>
          <span className="h-px flex-1 bg-orange-200" />
        </div>

        <div ref={googleButtonRef} className="flex min-h-11 items-center justify-center" />

        <div className="mt-4 text-center text-xs">
          {status === "loading" && <p className="text-orange-700">{message}</p>}
          {status === "error" && <p className="text-red-600">{message}</p>}
          {status === "success" && <p className="text-emerald-700">{message}</p>}
          {status === "idle" && (
            <p className="text-gray-500">Backend: {API_BASE}/api/v1/login/ and /api/v1/google/login/</p>
          )}
        </div>
      </div>
    </div>
  );
}
