"use client";

import Link from "next/link";
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const creditPlans = [
  {
    name: "Starter",
    credits: 250,
    price: "$9",
    note: "Best for trying the builder",
    features: ["25 AI sections", "Basic export", "Email support"],
    badge: "For New Users",
    accent: "from-orange-200 to-orange-100",
    border: "border-orange-200/80",
  },
  {
    name: "Growth",
    credits: 800,
    price: "$24",
    note: "Best value for weekly launches",
    features: ["80 AI sections", "Priority renders", "Theme sync tools"],
    badge: "Most Popular",
    accent: "from-orange-300 via-red-200 to-orange-100",
    border: "border-red-300/70",
  },
  {
    name: "Scale",
    credits: 2000,
    price: "$49",
    note: "For teams building at volume",
    features: ["200 AI sections", "Fast queue", "Team seats + API access"],
    badge: "Studio Tier",
    accent: "from-red-200 to-orange-100",
    border: "border-orange-300/80",
  },
];

const usageNotes = [
  { label: "Hero Section", cost: "8 credits" },
  { label: "Pricing Block", cost: "10 credits" },
  { label: "Testimonials", cost: "6 credits" },
  { label: "Full Landing Page", cost: "40-55 credits" },
];

export default function PricingPage() {
  const pricingRef = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.fromTo(
        ".pricing-badge",
        { y: 16, opacity: 0, filter: "blur(5px)" },
        { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.45 }
      )
        .fromTo(
          ".pricing-title-word",
          { yPercent: 120, opacity: 0, rotateX: -70 },
          { yPercent: 0, opacity: 1, rotateX: 0, duration: 0.8, stagger: 0.06 },
          "-=0.12"
        )
        .fromTo(".pricing-subtext", { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55 }, "-=0.35")
        .fromTo(
          ".pricing-card",
          { y: 28, opacity: 0, scale: 0.97, filter: "blur(4px)" },
          { y: 0, opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.55, stagger: 0.1 },
          "-=0.2"
        )
        .fromTo(
          ".pricing-usage",
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, stagger: 0.07 },
          "-=0.2"
        );

      const root = pricingRef.current;
      if (!root) return;

      const cards = gsap.utils.toArray<HTMLElement>(".pricing-card", root);
      const floatingTweens: gsap.core.Tween[] = [];
      const cleanupFns: Array<() => void> = [];

      cards.forEach((card, index) => {
        const floatTween = gsap.to(card, {
          y: -8,
          duration: 2.2 + index * 0.3,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
        floatingTweens.push(floatTween);

        const onEnter = () => {
          floatTween.pause();
          gsap.to(card, {
            y: -14,
            scale: 1.02,
            duration: 0.25,
            ease: "power2.out",
            boxShadow: "0 28px 56px rgba(239, 68, 68, 0.22)",
          });
        };

        const onLeave = () => {
          gsap.to(card, {
            y: 0,
            scale: 1,
            duration: 0.25,
            ease: "power2.out",
            boxShadow: "0 18px 42px rgba(249, 115, 22, 0.14)",
            onComplete: () => floatTween.resume(),
          });
        };

        card.addEventListener("mouseenter", onEnter);
        card.addEventListener("mouseleave", onLeave);
        cleanupFns.push(() => {
          card.removeEventListener("mouseenter", onEnter);
          card.removeEventListener("mouseleave", onLeave);
        });
      });

      return () => {
        tl.kill();
        floatingTweens.forEach((tween) => tween.kill());
        cleanupFns.forEach((cleanup) => cleanup());
      };
    },
    { scope: pricingRef }
  );

  return (
    <div ref={pricingRef} className="relative z-10">
      <section className="mx-auto w-full max-w-6xl px-6 pb-12 pt-36 sm:px-10 sm:pt-40">
        <div className="mx-auto max-w-4xl text-center">
          <p className="pricing-badge mb-5 inline-flex rounded-full border border-orange-200/70 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.13em] text-orange-700 backdrop-blur">
            Credit Packs
          </p>
          <h1 className="mb-5 text-4xl font-extrabold leading-tight text-gray-900 sm:text-5xl md:text-6xl">
            {["Flexible", "Credits", "For", "Every", "Build"].map((word) => (
              <span key={word} className="mr-3 inline-block overflow-hidden align-top last:mr-0">
                <span className="pricing-title-word inline-block [transform-origin:50%_100%]">
                  {word}
                </span>
              </span>
            ))}
          </h1>
          <p className="pricing-subtext mx-auto max-w-2xl text-base text-gray-700 sm:text-lg">
            Buy only what you need. Credits are consumed per generated section, regeneration, and
            premium layout export.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-12 sm:px-10">
        <div className="grid gap-4 md:grid-cols-3">
          {creditPlans.map((plan) => (
            <article
              key={plan.name}
              className={`pricing-card relative rounded-3xl border ${plan.border} bg-white/70 p-6 shadow-[0_18px_42px_rgba(249,115,22,0.14)] backdrop-blur`}
            >
              <div
                className={`absolute inset-x-5 top-0 h-1 rounded-full bg-gradient-to-r ${plan.accent}`}
              />
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">{plan.name}</h2>
                <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-orange-700">
                  {plan.badge}
                </span>
              </div>
              <p className="text-sm text-gray-700">{plan.note}</p>
              <div className="mt-5">
                <p className="text-4xl font-extrabold text-gray-900">{plan.price}</p>
                <p className="mt-1 text-sm font-semibold uppercase tracking-[0.1em] text-orange-600">
                  {plan.credits} Credits
                </p>
              </div>
              <ul className="mt-6 space-y-2">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="rounded-lg border border-orange-100 bg-white/75 px-3 py-2 text-sm text-gray-800"
                  >
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/?auth=login"
                className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-orange-400 to-red-500 px-4 py-3 text-sm font-semibold text-white transition hover:from-orange-300 hover:to-red-400"
              >
                Buy {plan.credits} Credits
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-24 sm:px-10">
        <div className="rounded-3xl border border-orange-200/70 bg-white/60 p-6 shadow-[0_20px_48px_rgba(249,115,22,0.14)] backdrop-blur sm:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-2xl font-bold text-gray-900">Credit Usage Preview</h3>
            <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-red-700">
              Transparent Billing
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {usageNotes.map((item) => (
              <div
                key={item.label}
                className="pricing-usage flex items-center justify-between rounded-xl border border-orange-100 bg-white/80 px-4 py-3"
              >
                <p className="text-sm font-medium text-gray-800">{item.label}</p>
                <p className="text-sm font-bold text-orange-700">{item.cost}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
