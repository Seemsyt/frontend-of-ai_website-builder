"use client";

import { API_BASE } from "./config";

let refreshPromise: Promise<string | null> | null = null;

export function clearAuthSession() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("auth_user");
  window.dispatchEvent(new Event("auth-changed"));
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) return null;

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE}/api/v1/token/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (!response.ok) return null;
      const data = (await response.json()) as { access?: string };
      if (!data.access) return null;

      localStorage.setItem("access_token", data.access);
      return data.access;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const accessToken = localStorage.getItem("access_token");
  const headers = new Headers(init.headers || {});
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  let response = await fetch(input, { ...init, headers });
  if (response.status !== 401) return response;

  const newAccessToken = await refreshAccessToken();
  if (!newAccessToken) {
    clearAuthSession();
    return response;
  }

  const retryHeaders = new Headers(init.headers || {});
  retryHeaders.set("Authorization", `Bearer ${newAccessToken}`);
  response = await fetch(input, { ...init, headers: retryHeaders });

  if (response.status === 401) {
    clearAuthSession();
  }

  return response;
}
