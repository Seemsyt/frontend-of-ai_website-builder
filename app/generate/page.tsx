"use client";

import Link from "next/link";
import { FormEvent, MouseEvent as ReactMouseEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "../lib/auth";
import { API_BASE } from "../lib/config";

type UiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  code?: string;
  website?: WebsiteItem;
  showCode?: boolean;
};

type ChatCompleteResponse = {
  thread?: { id: number };
  current_code?: string;
  current_website?: WebsiteItem | null;
  assistant_message?: {
    content?: string;
    metadata?: {
      website_id?: number;
      code?: string;
      website?: WebsiteItem;
    };
  };
};

type WebsiteItem = {
  id: number;
  name: string;
  code: string;
  domain: string;
  deploy_url: string;
  deployed_at: string | null;
  created_at: string;
  updated_at: string;
};

type ThreadListItem = {
  id: number;
  title: string;
  updated_at: string;
  last_message: string;
};

type ThreadDetailResponse = {
  id: number;
  messages: Array<{
    id: number;
    role: string;
    content: string;
    metadata?: {
      website_id?: number;
      code?: string;
      website?: WebsiteItem;
    };
  }>;
};

type PanelKey = "left" | "center" | "right";

const MIN_LEFT_PANEL_WIDTH = 240;
const MIN_RIGHT_PANEL_WIDTH = 320;
const MIN_CENTER_PANEL_WIDTH = 480;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const decodeEscapedContent = (value: string): string =>
  value
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, "\\");

const extractQuotedField = (text: string, fieldName: "message" | "code"): string => {
  const fieldRegex = new RegExp(`"${fieldName}"\\s*:\\s*"`, "i");
  const match = fieldRegex.exec(text);
  if (!match) return "";

  let index = (match.index || 0) + match[0].length;
  let escaped = false;
  let result = "";

  while (index < text.length) {
    const char = text[index];
    if (escaped) {
      result += `\\${char}`;
      escaped = false;
    } else if (char === "\\") {
      escaped = true;
    } else if (char === '"') {
      break;
    } else {
      result += char;
    }
    index += 1;
  }

  return decodeEscapedContent(result.trim());
};

const parseAssistantPayload = (text: string): { message: string; code: string } => {
  const trimmed = text.trim();
  if (!trimmed) return { message: "", code: "" };

  const parseObject = (value: unknown): { message: string; code: string } | null => {
    if (!value || typeof value !== "object") return null;
    const candidate = value as Record<string, unknown>;
    const message = typeof candidate.message === "string" ? candidate.message.trim() : "";
    const code = typeof candidate.code === "string" ? candidate.code.trim() : "";
    if (!message && !code) return null;
    return { message, code };
  };

  try {
    const parsed = parseObject(JSON.parse(trimmed));
    if (parsed) return parsed;
  } catch {
    // Continue to fallback parsing.
  }

  const fencedJsonMatch = trimmed.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i);
  if (fencedJsonMatch) {
    try {
      const parsed = parseObject(JSON.parse(fencedJsonMatch[1]));
      if (parsed) return parsed;
    } catch {
      // Keep other fallbacks.
    }
  }

  const fencedHtmlMatch = trimmed.match(/```(?:html)?\s*([\s\S]*?)\s*```/i);
  if (fencedHtmlMatch) {
    const code = fencedHtmlMatch[1].trim();
    const message = trimmed.replace(fencedHtmlMatch[0], "").trim();
    if (code) return { message, code };
  }

  const jsonObjectMatch = trimmed.match(/\{[\s\S]*"code"[\s\S]*\}/);
  if (jsonObjectMatch) {
    try {
      const parsed = parseObject(JSON.parse(jsonObjectMatch[0]));
      if (parsed) return parsed;
    } catch {
      // Keep plain text fallback.
    }
  }

  const objectBodyMatch = trimmed.match(/^\s*"message"\s*:[\s\S]*"code"\s*:[\s\S]*$/i);
  if (objectBodyMatch) {
    try {
      const parsed = parseObject(JSON.parse(`{${trimmed}}`));
      if (parsed) return parsed;
    } catch {
      const message = extractQuotedField(trimmed, "message");
      const code = extractQuotedField(trimmed, "code");
      if (message || code) return { message, code };
    }
  }

  if (trimmed.includes('"code"')) {
    const message = extractQuotedField(trimmed, "message");
    const code = extractQuotedField(trimmed, "code");
    if (message || code) return { message, code };
  }

  if (trimmed.toLowerCase().includes("<html") && trimmed.toLowerCase().includes("</html>")) {
    const htmlMatch = trimmed.match(/<!doctype html[\s\S]*<\/html>|<html[\s\S]*<\/html>/i);
    const code = (htmlMatch?.[0] || trimmed).trim();
    const message = htmlMatch ? trimmed.replace(htmlMatch[0], "").trim() : "";
    return { message, code };
  }

  return { message: trimmed, code: "" };
};

export default function GeneratePage() {
  const router = useRouter();
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [threadId, setThreadId] = useState<number | null>(null);
  const [threads, setThreads] = useState<ThreadListItem[]>([]);
  const [websitesById, setWebsitesById] = useState<Record<number, WebsiteItem>>({});
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const [deployingWebsiteId, setDeployingWebsiteId] = useState<number | null>(null);
  const [selectedPreviewMessageId, setSelectedPreviewMessageId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [showBuyCreditsLink, setShowBuyCreditsLink] = useState(false);
  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(null);
  const [isMobileChatsOpen, setIsMobileChatsOpen] = useState(false);
  const [isMobilePreviewOpen, setIsMobilePreviewOpen] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const desktopLayoutRef = useRef<HTMLDivElement | null>(null);
  const [panelVisibility, setPanelVisibility] = useState<Record<PanelKey, boolean>>({
    left: true,
    center: true,
    right: true,
  });
  const [panelWidths, setPanelWidths] = useState({ left: 288, right: 560 });
  const codeMessages = messages.filter((msg) => msg.role === "assistant" && !!msg.code);
  const activePreviewMessage = codeMessages.find((msg) => msg.id === selectedPreviewMessageId);

  const fetchThreads = async () => {
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) {
      router.replace("/?auth=login");
      return;
    }

    try {
      setIsLoadingThreads(true);
      const response = await authFetch(`${API_BASE}/api/v1/chat/threads/`);

      if (!response.ok) return;
      const data = (await response.json()) as ThreadListItem[];
      setThreads(data);
    } finally {
      setIsLoadingThreads(false);
    }
  };

  const fetchWebsites = async () => {
    try {
      const response = await authFetch(`${API_BASE}/api/v1/websites/`);
      if (!response.ok) return;
      const websites = (await response.json()) as WebsiteItem[];
      const byId: Record<number, WebsiteItem> = {};
      websites.forEach((website) => {
        byId[website.id] = website;
      });
      setWebsitesById(byId);
    } catch {
      // Keep chat usable even if websites fetch fails.
    }
  };

  const openThread = async (id: number) => {
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) {
      router.replace("/?auth=login");
      return;
    }

    try {
      let websiteMap = websitesById;
      if (Object.keys(websiteMap).length === 0) {
        const websitesResponse = await authFetch(`${API_BASE}/api/v1/websites/`);
        if (websitesResponse.ok) {
          const websites = (await websitesResponse.json()) as WebsiteItem[];
          const byId: Record<number, WebsiteItem> = {};
          websites.forEach((website) => {
            byId[website.id] = website;
          });
          setWebsitesById(byId);
          websiteMap = byId;
        }
      }

      const response = await authFetch(`${API_BASE}/api/v1/chat/threads/${id}/`);
      if (!response.ok) return;

      const data = (await response.json()) as ThreadDetailResponse;
      const mapped = data.messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => {
          const parsedPayload =
            m.role === "assistant" ? parseAssistantPayload(m.content || "") : { message: m.content, code: "" };
          const websiteFromMeta = m.metadata?.website;
          const websiteFromId = m.metadata?.website_id ? websiteMap[m.metadata.website_id] : undefined;
          const website = websiteFromId || websiteFromMeta;
          return {
            id: `${m.role}-${m.id}`,
            role: m.role as "user" | "assistant",
            content: parsedPayload.message || m.content,
            code: website?.code || m.metadata?.code || parsedPayload.code,
            website,
            showCode: false,
          };
        });

      setThreadId(id);
      setMessages(mapped);
      setSelectedPreviewMessageId(null);
      setIsMobileChatsOpen(false);
      setError("");
    } catch {
      setError("Unable to open selected chat.");
    }
  };

  useEffect(() => {
    void fetchThreads();
    void fetchWebsites();
  }, [API_BASE]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (!activePreviewMessage?.code) {
      setActivePreviewUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return null;
      });
      return;
    }

    const blob = new Blob([activePreviewMessage.code], { type: "text/html" });
    const previewUrl = URL.createObjectURL(blob);
    setActivePreviewUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return previewUrl;
    });

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [activePreviewMessage?.id, activePreviewMessage?.code]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const message = prompt.trim();
    if (!message || isLoading) return;

    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) {
      router.replace("/?auth=login");
      return;
    }

    const userMessage: UiMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: message,
    };

    setPrompt("");
    setError("");
    setShowBuyCreditsLink(false);
    setSelectedPreviewMessageId(null);
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    const controller = new AbortController();
    setAbortController(controller);

    try {
      const response = await authFetch(`${API_BASE}/api/v1/chat/complete/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          message,
          ...(threadId ? { thread_id: threadId } : {}),
        }),
      });

      const data = (await response.json()) as ChatCompleteResponse & { detail?: string };
      if (!response.ok) {
        if (response.status === 402) {
          setShowBuyCreditsLink(true);
        }
        throw new Error(data.detail || "Unable to generate response.");
      }

      if (data.thread?.id) {
        setThreadId(data.thread.id);
      }

      const assistantText = data.assistant_message?.content?.trim() || "";
      const parsedPayload = parseAssistantPayload(assistantText);
      const newCode = data.current_code || data.assistant_message?.metadata?.code || parsedPayload.code;
      if (assistantText || newCode) {
        const newAssistantId = `a-${Date.now()}`;
        const newWebsite = data.current_website || data.assistant_message?.metadata?.website;
        setMessages((prev) => [
          ...prev,
          {
            id: newAssistantId,
            role: "assistant",
            content: parsedPayload.message || "Generated your website and attached the code preview.",
            code: newCode,
            website: newWebsite || undefined,
            showCode: false,
          },
        ]);
      }
      void fetchThreads();
      void fetchWebsites();
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("Generation cancelled.");
      } else {
        setError(err instanceof Error ? err.message : "Unable to generate response.");
      }
    } finally {
      setIsLoading(false);
      setAbortController(null);
    }
  };

  const handleNewChat = () => {
    setThreadId(null);
    setMessages([]);
    setSelectedPreviewMessageId(null);
    setIsMobileChatsOpen(false);
    setError("");
    setShowBuyCreditsLink(false);
    setPrompt("");
  };

  const handlePreview = (code: string) => {
    const blob = new Blob([code], { type: "text/html" });
    const previewUrl = URL.createObjectURL(blob);
    window.open(previewUrl, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(previewUrl), 30000);
  };

  const toggleCode = (messageId: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              showCode: !msg.showCode,
            }
          : msg,
      ),
    );
  };

  const togglePanel = (panel: PanelKey) => {
    setPanelVisibility((prev) => {
      const openPanelCount = Object.values(prev).filter(Boolean).length;
      if (prev[panel] && openPanelCount === 1) return prev;
      return { ...prev, [panel]: !prev[panel] };
    });
  };

  const startResize = (panel: "left" | "right") => (event: ReactMouseEvent<HTMLDivElement>) => {
    const layout = desktopLayoutRef.current;
    if (!layout) return;
    event.preventDefault();

    const leftWidthAtStart = panelWidths.left;
    const rightWidthAtStart = panelWidths.right;
    const { left: isLeftOpen, center: isCenterOpen, right: isRightOpen } = panelVisibility;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const bounds = layout.getBoundingClientRect();
      const layoutWidth = bounds.width;

      if (panel === "left") {
        const maxLeftWidth = Math.max(
          MIN_LEFT_PANEL_WIDTH,
          layoutWidth - (isRightOpen ? rightWidthAtStart : 0) - (isCenterOpen ? MIN_CENTER_PANEL_WIDTH : 0),
        );
        const nextLeftWidth = clamp(moveEvent.clientX - bounds.left, MIN_LEFT_PANEL_WIDTH, maxLeftWidth);
        setPanelWidths((prev) => ({ ...prev, left: nextLeftWidth }));
        return;
      }

      const maxRightWidth = Math.max(
        MIN_RIGHT_PANEL_WIDTH,
        layoutWidth - (isLeftOpen ? leftWidthAtStart : 0) - (isCenterOpen ? MIN_CENTER_PANEL_WIDTH : 0),
      );
      const nextRightWidth = clamp(bounds.right - moveEvent.clientX, MIN_RIGHT_PANEL_WIDTH, maxRightWidth);
      setPanelWidths((prev) => ({ ...prev, right: nextRightWidth }));
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const handleDeploy = async (messageId: string, website: WebsiteItem | undefined) => {
    if (!website || deployingWebsiteId) return;
    setDeployingWebsiteId(website.id);
    setError("");

    try {
      const response = await authFetch(`${API_BASE}/api/v1/websites/${website.id}/deploy/`, {
        method: "POST",
      });
      const data = (await response.json()) as WebsiteItem & { detail?: string };
      if (!response.ok) {
        throw new Error(data.detail || "Unable to deploy website.");
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                website: data,
                code: data.code || msg.code,
              }
            : msg,
        ),
      );

      if (data.deploy_url) {
        window.open(data.deploy_url, "_blank", "noopener,noreferrer");
      }
      void fetchWebsites();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to deploy website.");
    } finally {
      setDeployingWebsiteId(null);
    }
  };

  const closedPanels = (Object.entries(panelVisibility) as Array<[PanelKey, boolean]>).filter(
    ([, isOpen]) => !isOpen,
  );

  return (
    <div className="relative z-10 h-[100dvh] w-full px-3 pb-3 pt-20 sm:px-4">
      <div className="fixed left-0 top-1/2 z-30 -translate-y-1/2 md:hidden">
        <button
          type="button"
          onClick={() => setIsMobileChatsOpen((prev) => !prev)}
          className="rounded-r-full border border-l-0 border-orange-300 bg-white/95 px-2.5 py-3 text-lg font-bold text-orange-700 shadow-md backdrop-blur transition hover:bg-orange-50"
          aria-label={isMobileChatsOpen ? "Close chat history" : "Open chat history"}
        >
          {isMobileChatsOpen ? "<" : ">"}
        </button>
      </div>

      <div
        className={`fixed inset-0 z-30 bg-black/30 transition-opacity md:hidden ${
          isMobileChatsOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setIsMobileChatsOpen(false)}
      />

      <aside
        className={`fixed left-0 top-0 z-40 h-full w-[84%] max-w-xs border-r border-orange-200/80 bg-white/95 p-3 shadow-xl backdrop-blur transition-transform duration-300 md:hidden ${
          isMobileChatsOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-orange-700">Chats</p>
          <button
            type="button"
            onClick={() => setIsMobileChatsOpen(false)}
            className="rounded-md border border-orange-200 bg-white px-2 py-1 text-xs font-semibold text-orange-700 transition hover:bg-orange-100"
          >
            Close
          </button>
        </div>
        <button
          type="button"
          onClick={handleNewChat}
          className="mb-3 w-full rounded-xl bg-gradient-to-r from-orange-400 to-red-500 px-3 py-2 text-sm font-semibold text-white transition hover:from-orange-300 hover:to-red-400"
        >
          + New Chat
        </button>
        <div className="h-[calc(100%-94px)] space-y-2 overflow-y-auto">
          {isLoadingThreads && <p className="px-2 text-xs text-gray-600">Loading chats...</p>}
          {!isLoadingThreads && threads.length === 0 && (
            <p className="px-2 text-xs text-gray-600">No previous chats yet.</p>
          )}
          {threads.map((thread) => (
            <button
              key={`mobile-${thread.id}`}
              type="button"
              onClick={() => void openThread(thread.id)}
              className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                threadId === thread.id
                  ? "border-orange-300 bg-orange-50"
                  : "border-orange-200 bg-white hover:border-orange-300"
              }`}
            >
              <p className="truncate text-sm font-semibold text-gray-900">{thread.title || "New chat"}</p>
              <p className="mt-1 line-clamp-2 text-xs text-gray-600">
                {thread.last_message || "No messages yet"}
              </p>
            </button>
          ))}
        </div>
      </aside>

      {closedPanels.length > 0 && (
        <div className="pointer-events-none absolute left-3 top-20 z-20 flex flex-wrap gap-2 sm:left-4">
          {!panelVisibility.left && (
            <button
              type="button"
              onClick={() => togglePanel("left")}
              className="pointer-events-auto rounded-full border border-orange-200 bg-white/95 px-3 py-1.5 text-xs font-semibold text-orange-700 shadow-sm transition hover:border-orange-300"
            >
              Open Chats
            </button>
          )}
          {!panelVisibility.center && (
            <button
              type="button"
              onClick={() => togglePanel("center")}
              className="pointer-events-auto rounded-full border border-orange-200 bg-white/95 px-3 py-1.5 text-xs font-semibold text-orange-700 shadow-sm transition hover:border-orange-300"
            >
              Open Workspace
            </button>
          )}
          {!panelVisibility.right && (
            <button
              type="button"
              onClick={() => togglePanel("right")}
              className="pointer-events-auto hidden rounded-full border border-orange-200 bg-white/95 px-3 py-1.5 text-xs font-semibold text-orange-700 shadow-sm transition hover:border-orange-300 lg:inline-flex"
            >
              Open Preview
            </button>
          )}
        </div>
      )}

      <div ref={desktopLayoutRef} className="flex h-full min-w-0 gap-3">
      {panelVisibility.left && (
      <aside
        className="hidden shrink-0 flex-col rounded-2xl border border-orange-200/70 bg-white/75 p-3 backdrop-blur md:flex"
        style={{ width: panelWidths.left }}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-orange-700">Chats</p>
          <button
            type="button"
            onClick={() => togglePanel("left")}
            className="rounded-md border border-orange-200 bg-white px-2 py-1 text-xs font-semibold text-orange-700 transition hover:bg-orange-100"
          >
            Close
          </button>
        </div>
        <button
          type="button"
          onClick={handleNewChat}
          className="mb-3 rounded-xl bg-gradient-to-r from-orange-400 to-red-500 px-3 py-2 text-sm font-semibold text-white transition hover:from-orange-300 hover:to-red-400"
        >
          + New Chat
        </button>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
          {isLoadingThreads && <p className="px-2 text-xs text-gray-600">Loading chats...</p>}
          {!isLoadingThreads && threads.length === 0 && (
            <p className="px-2 text-xs text-gray-600">No previous chats yet.</p>
          )}
          {threads.map((thread) => (
            <button
              key={thread.id}
              type="button"
              onClick={() => void openThread(thread.id)}
              className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                threadId === thread.id
                  ? "border-orange-300 bg-orange-50"
                  : "border-orange-200 bg-white hover:border-orange-300"
              }`}
            >
              <p className="truncate text-sm font-semibold text-gray-900">{thread.title || "New chat"}</p>
              <p className="mt-1 line-clamp-2 text-xs text-gray-600">
                {thread.last_message || "No messages yet"}
              </p>
            </button>
          ))}
        </div>
      </aside>
      )}
      {panelVisibility.left && panelVisibility.center && (
        <div
          role="separator"
          aria-label="Resize chats panel"
          aria-orientation="vertical"
          onMouseDown={startResize("left")}
          className="hidden w-1 cursor-col-resize rounded-full bg-orange-200/80 transition hover:bg-orange-300 lg:block"
        />
      )}
      {panelVisibility.center && (
      <section className="flex min-w-0 min-h-0 flex-1 flex-col">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
              Website Generator
            </p>
            <h1 className="mt-1 text-xl font-extrabold text-gray-900 sm:text-2xl">
              Generate Website With AI
            </h1>
          </div>
          <button
            type="button"
            onClick={handleNewChat}
            className="rounded-full border border-orange-200 bg-white/70 px-4 py-2 text-sm font-semibold text-orange-700 transition hover:border-orange-300 md:hidden"
          >
            New Chat
          </button>
          <button
            type="button"
            onClick={() => togglePanel("center")}
            className="hidden rounded-full border border-orange-200 bg-white/70 px-3 py-2 text-sm font-semibold text-orange-700 transition hover:border-orange-300 lg:inline-flex"
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-orange-200/70 bg-white/70 p-4 shadow-[0_16px_36px_rgba(249,115,22,0.12)] backdrop-blur sm:p-6">
          {messages.length === 0 ? (
            <div className="mx-auto mt-16 max-w-3xl text-center">
              <p className="text-lg font-semibold text-gray-900 sm:text-xl">
                Start by describing your website idea.
              </p>
              <p className="mt-2 text-sm text-gray-700 sm:text-base">
                Example: Build a modern portfolio website for a freelance designer with hero,
                services, testimonials, and contact section.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[80%] sm:text-base ${
                    msg.role === "user"
                      ? "ml-auto bg-gradient-to-r from-orange-500 to-red-500 text-white"
                      : "mr-auto border border-orange-200 bg-white text-gray-900"
                  }`}
                >
                  <p>{msg.content}</p>
                  {msg.role === "assistant" && msg.code && (
                    <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50/50 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-orange-700">
                        Generated Version: {msg.website?.name || "Website"}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedPreviewMessageId(msg.id)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                            activePreviewMessage?.id === msg.id
                              ? "bg-orange-600 text-white"
                              : "border border-orange-300 bg-white text-orange-700 hover:bg-orange-100"
                          }`}
                        >
                          {activePreviewMessage?.id === msg.id ? "Showing in Side Preview" : "Show in Side Preview"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePreview(msg.code)}
                          className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-600"
                        >
                          Full Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeploy(msg.id, msg.website)}
                          disabled={!msg.website || deployingWebsiteId === msg.website?.id}
                          className="rounded-lg border border-orange-300 bg-white px-3 py-1.5 text-xs font-semibold text-orange-700 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deployingWebsiteId === msg.website?.id ? "Deploying..." : "Deploy"}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleCode(msg.id)}
                          className="rounded-lg border border-orange-300 bg-white px-3 py-1.5 text-xs font-semibold text-orange-700 transition hover:bg-orange-100"
                        >
                          {msg.showCode ? "Hide Code" : "Show Code"}
                        </button>
                        {msg.website?.deploy_url && (
                          <a
                            href={msg.website.deploy_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg border border-orange-200 bg-white px-3 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-100"
                          >
                            Open Live
                          </a>
                        )}
                      </div>
                      {msg.showCode && (
                        <pre className="mt-2 max-h-72 overflow-auto rounded-lg border border-orange-100 bg-gray-900 p-3 text-xs text-orange-100">
                          <code>{msg.code}</code>
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="mr-auto flex items-center gap-3 rounded-2xl border border-orange-200 bg-white px-4 py-3 text-sm text-gray-700">
                  <svg className="h-5 w-5 animate-spin text-orange-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                  <span>Generating…</span>
                  {abortController && (
                    <button
                      type="button"
                      onClick={() => {
                        abortController.abort();
                        setAbortController(null);
                        setIsLoading(false);
                      }}
                      className="ml-2 rounded-md border border-orange-200 bg-white px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              )}
              <div ref={endRef} />
            </div>
          )}
        </div>

        <div className="mt-3 rounded-2xl border border-orange-200/70 bg-white/85 px-4 py-3 shadow-[0_8px_24px_rgba(249,115,22,0.08)] backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-orange-700">Preview</p>
              <p className="text-xs text-orange-700/80">
                {activePreviewMessage?.website?.name || "Select 'Show in Side Preview' from a response"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {activePreviewMessage?.code && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsMobilePreviewOpen((prev) => !prev)}
                    className="rounded-lg border border-orange-300 bg-white px-3 py-1.5 text-xs font-semibold text-orange-700 transition hover:bg-orange-100"
                  >
                    {isMobilePreviewOpen ? "Hide" : "Show"}
                  </button>
                  <button
                    type="button"
                    onClick={() => activePreviewMessage.code && handlePreview(activePreviewMessage.code)}
                    className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-600"
                  >
                    Open Full
                  </button>
                </>
              )}
            </div>
          </div>
          {activePreviewMessage?.code && isMobilePreviewOpen && (
            <iframe
              title={activePreviewMessage.website?.name || "Generated Website Preview"}
              src={activePreviewUrl || undefined}
              sandbox="allow-scripts allow-forms allow-modals"
              className="mt-3 h-64 w-full rounded-xl bg-white"
            />
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-3">
          <div className="flex items-end gap-2 rounded-2xl border border-orange-200 bg-white/80 p-2 backdrop-blur">
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Describe the website you want to generate..."
              className="h-12 max-h-44 min-h-12 w-full resize-y rounded-xl bg-transparent px-3 py-2 text-sm text-gray-900 outline-none sm:text-base"
            />
            <button
              type="submit"
              disabled={isLoading || !prompt.trim()}
              className="rounded-xl bg-gradient-to-r from-orange-400 to-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:from-orange-300 hover:to-red-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Send
            </button>
          </div>
          {error && (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <p className="text-sm font-medium text-red-600">{error}</p>
              {showBuyCreditsLink && (
                <Link
                  href="/pricing"
                  className="rounded-md border border-orange-300 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700 transition hover:bg-orange-100"
                >
                  Buy Credits
                </Link>
              )}
            </div>
          )}
        </form>
      </section>
      )}
      {panelVisibility.center && panelVisibility.right && (
        <div
          role="separator"
          aria-label="Resize preview panel"
          aria-orientation="vertical"
          onMouseDown={startResize("right")}
          className="hidden w-1 cursor-col-resize rounded-full bg-orange-200/80 transition hover:bg-orange-300 lg:block"
        />
      )}
      {panelVisibility.right && (
      <aside
        className="hidden shrink-0 flex-col overflow-hidden rounded-2xl border border-orange-200/70 bg-white/85 shadow-[0_16px_36px_rgba(249,115,22,0.1)] backdrop-blur lg:flex"
        style={{ width: panelWidths.right }}
      >
        <div className="flex items-center justify-between border-b border-orange-100 bg-orange-50 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-orange-700">Side Preview</p>
            <p className="text-xs text-orange-700/80">
              {activePreviewMessage?.website?.name || "Generate a website/app to preview"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {activePreviewMessage?.code && (
              <button
                type="button"
                onClick={() => activePreviewMessage.code && handlePreview(activePreviewMessage.code)}
                className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-600"
              >
                Open Full
              </button>
            )}
            <button
              type="button"
              onClick={() => togglePanel("right")}
              className="rounded-md border border-orange-200 bg-white px-2 py-1 text-xs font-semibold text-orange-700 transition hover:bg-orange-100"
            >
              Close
            </button>
          </div>
        </div>
        {activePreviewMessage?.code ? (
          <iframe
            title={activePreviewMessage.website?.name || "Generated Website Side Preview"}
            src={activePreviewUrl || undefined}
            sandbox="allow-scripts allow-forms allow-modals"
            className="h-full w-full bg-white"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center">
            <p className="text-sm text-gray-600">
              Ask for a website or app (for example: a modern calculator with history and keyboard support) and it
              will appear here as a live preview.
            </p>
          </div>
        )}
      </aside>
      )}
      </div>
    </div>
  );
}
