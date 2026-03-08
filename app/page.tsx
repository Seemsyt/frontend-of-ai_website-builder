"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const heroTitleWords = ["Build", "Your", "Dream", "Website", "With"];
const heroAccentWords = ["Smart", "AI"];
const highlightCards = [
  {
    title: "AI Sections",
    description: "Generate complete, conversion-focused sections instantly from one prompt.",
  },
  {
    title: "Brand Sync",
    description: "Apply your colors, typography, and voice across the full site in seconds.",
  },
  {
    title: "One-Click Launch",
    description: "Publish fast with optimized pages, responsive layouts, and clean structure.",
  },
];
const proofPoints = ["No Code Needed", "Conversion Ready", "Deploy in Minutes"];
const previewStack = ["Hero content block", "Pricing table", "Testimonials"];

export default function Home() {
  const router = useRouter();
  const heroRef = useRef<HTMLDivElement | null>(null);
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const hasAccessToken = isClient && Boolean(localStorage.getItem("access_token"));

  useEffect(() => {
    if (hasAccessToken) {
      router.replace("/generate");
    }
  }, [hasAccessToken, router]);


  useGSAP(
    () => {
      if (hasAccessToken) return;
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.fromTo(
        ".hero-badge",
        { y: 18, opacity: 0, filter: "blur(6px)" },
        { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.5 }
      )
        .fromTo(
          ".hero-word",
          { yPercent: 120, opacity: 0, rotateX: -80 },
          { yPercent: 0, opacity: 1, rotateX: 0, duration: 0.8, stagger: 0.06 },
          "-=0.15"
        )
        .fromTo(
          ".hero-subtext",
          { y: 24, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.55 },
          "-=0.35"
        )
        .fromTo(
          ".hero-proof",
          { y: 14, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.4, stagger: 0.06 },
          "-=0.2"
        )
        .fromTo(
          ".hero-preview-shell",
          { x: 24, opacity: 0, scale: 0.96, filter: "blur(6px)" },
          { x: 0, opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.6 },
          "-=0.3"
        )
        .fromTo(
          ".highlight-card",
          { y: 24, opacity: 0, scale: 0.98 },
          { y: 0, opacity: 1, scale: 1, duration: 0.55, stagger: 0.1 },
          "-=0.1"
        );

      const root = heroRef.current;
      if (!root) return;

      const wordElements = gsap.utils.toArray<HTMLElement>(".hero-word", root);
     

      const cleanupFns: Array<() => void> = [];
      const floatingTweens: gsap.core.Tween[] = [];

      wordElements.forEach((word) => {
        const onEnter = () => {
          gsap.to(word, {
            y: -6,
            scale: 1.03,
            rotateX: 8,
            duration: 0.25,
            ease: "power2.out",
          });
        };

        const onLeave = () => {
          gsap.to(word, {
            y: 0,
            scale: 1,
            rotateX: 0,
            duration: 0.25,
            ease: "power2.out",
          });
        };

        word.addEventListener("mouseenter", onEnter);
        word.addEventListener("mouseleave", onLeave);
        cleanupFns.push(() => {
          word.removeEventListener("mouseenter", onEnter);
          word.removeEventListener("mouseleave", onLeave);
        });
      });

;
    },
    { scope: heroRef, dependencies: [hasAccessToken] }
  );

  if (hasAccessToken) return null;

  return (
    <div ref={heroRef} className="relative z-10">
      <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-36 sm:px-10 sm:pt-40 lg:min-h-screen lg:pt-44">
        <div className="grid items-center gap-10 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="relative z-10 text-center lg:text-left">
            <div className="hero-badge mb-6 inline-flex items-center rounded-full border border-orange-200/70 bg-white/70 px-4 py-2 text-sm font-medium text-orange-700 shadow-sm backdrop-blur">
              AI-Powered Builder For Fast Launches
            </div>

            <h1 className="mx-auto mb-6 max-w-4xl text-4xl font-extrabold leading-tight text-gray-900 sm:text-5xl md:text-6xl lg:mx-0 lg:text-7xl">
              {heroTitleWords.map((word) => (
                <span key={word} className="mr-3 inline-block overflow-hidden align-top">
                  <span className="hero-word inline-block origin-[50%_100%]">{word}</span>
                </span>
              ))}
              {heroAccentWords.map((word, index) => (
                <span
                  key={word}
                  className={`inline-block overflow-hidden align-top ${
                    index === 0 ? "mr-3" : ""
                  }`}
                >
                  <span className="hero-word inline-block bg-linear-to-r from-orange-500 via-red-500 to-orange-500 bg-clip-text text-transparent origin-[50%_100%]">
                    {word}
                  </span>
                </span>
              ))}
            </h1>

            <p className="hero-subtext mx-auto mb-10 max-w-2xl text-base text-gray-700 sm:text-lg lg:mx-0 lg:text-xl">
              Create, customize, and launch a complete website in minutes with guided AI design,
              conversion-focused sections, and instant publishing.
            </p>

            <div className="mb-8 flex flex-wrap justify-center gap-2 lg:justify-start">
              {proofPoints.map((point) => (
                <span
                  key={point}
                  className="hero-proof rounded-full border border-orange-200 bg-white/65 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-orange-700 backdrop-blur"
                >
                  {point}
                </span>
              ))}
            </div>
          </div>

          <div className="hero-preview-shell relative mx-auto w-full max-w-md rounded-3xl border border-white/70 bg-white/60 p-4 shadow-[0_30px_80px_rgba(249,115,22,0.24)] backdrop-blur lg:mx-0 transform-3d">
            <div className="hero-preview-orb pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-linear-to-br from-orange-300/80 to-red-400/70 blur-2xl" />
            <div className="rounded-2xl border border-orange-100 bg-linear-to-br from-white to-orange-50 p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">Landing Builder</p>
                <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                  Live Preview
                </span>
              </div>
              <div className="space-y-3">
                {previewStack.map((item, index) => (
                  <div
                    key={item}
                    className="rounded-xl border border-orange-100 bg-white px-4 py-3 shadow-sm"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-orange-500">
                      Section {index + 1}
                    </p>
                    <p className="mt-1 text-sm font-medium text-gray-800">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-20 sm:px-10">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
            Platform Highlights
          </p>
          <h2 className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">
            Everything You Need To Launch Faster
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {highlightCards.map((card) => (
            <article
              key={card.title}
              className="highlight-card rounded-2xl border border-orange-200/70 bg-white/65 p-6 shadow-[0_18px_40px_rgba(249,115,22,0.14)] backdrop-blur transition hover:shadow-[0_24px_50px_rgba(239,68,68,0.22)]"
            >
              <h3 className="text-lg font-semibold text-gray-900">{card.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-700">{card.description}</p>
            </article>
          ))}
        </div>
      </section>

    </div>
  );
}
