"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch, clearAuthSession } from "../lib/auth";
import { API_BASE } from "../lib/config";

type WebsiteItem = {
  id: number;
  name: string;
  domain: string;
  created_at: string;
  updated_at: string;
};

type DashboardResponse = {
  credits: number;
  website_count: number;
  websites: WebsiteItem[];
};

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const toWebsiteUrl = (domain: string) => {
    const value = (domain || "").trim();
    if (!value) return "";
    if (value.startsWith("http://") || value.startsWith("https://")) return value;
    return `https://${value}`;
  };

  useEffect(() => {
    const loadDashboard = async () => {
      const accessToken = localStorage.getItem("access_token");
      if (!accessToken) {
        router.replace("/?auth=login");
        return;
      }

      try {
        const response = await authFetch(`${API_BASE}/api/v1/dashboard/`);

        if (response.status === 401) {
          clearAuthSession();
          router.replace("/?auth=login");
          return;
        }

        if (!response.ok) {
          throw new Error("Unable to load dashboard.");
        }

        const payload = (await response.json()) as DashboardResponse;
        setData(payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load dashboard.");
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, [router]);

  return (
    <div className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-20 pt-36 sm:px-10 sm:pt-40">
      <div className="rounded-3xl border border-orange-200/70 bg-white/70 p-6 shadow-[0_20px_48px_rgba(249,115,22,0.14)] backdrop-blur sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-600">Dashboard</p>
        <h1 className="mt-2 text-3xl font-extrabold text-gray-900 sm:text-4xl">Your Websites</h1>
        <p className="mt-2 text-sm text-gray-700">
          View all websites linked to your account and your remaining credits.
        </p>

        {loading && <p className="mt-8 text-sm font-medium text-orange-700">Loading dashboard...</p>}

        {!loading && error && <p className="mt-8 text-sm font-medium text-red-600">{error}</p>}

        {!loading && data && (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-orange-200 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-orange-600">
                  Remaining Credits
                </p>
                <p className="mt-2 text-4xl font-extrabold text-gray-900">{data.credits}</p>
              </div>
              <div className="rounded-2xl border border-orange-200 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-orange-600">
                  Total Websites
                </p>
                <p className="mt-2 text-4xl font-extrabold text-gray-900">{data.website_count}</p>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              {data.websites.length === 0 ? (
                <div className="rounded-xl border border-orange-200 bg-white px-4 py-5">
                  <p className="text-sm text-gray-700">No websites found for your account yet.</p>
                </div>
              ) : (
                data.websites.map((website) => (
                  <div
                    key={website.id}
                    className="rounded-xl border border-orange-200 bg-white px-4 py-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-lg font-semibold text-gray-900">
                        <Link href={`/generate`} className="transition hover:text-orange-700">
                          {website.name}
                        </Link>
                      </h2>
                      <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                        Updated {new Date(website.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                    <a
                      href={toWebsiteUrl(website.domain)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex text-sm font-medium text-orange-700 underline underline-offset-2 transition hover:text-orange-600"
                    >
                      {website.domain}
                    </a>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
