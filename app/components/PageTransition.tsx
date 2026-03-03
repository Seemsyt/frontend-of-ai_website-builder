"use client";

import { ReactNode, useRef } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

type PageTransitionProps = {
  children: ReactNode;
};

export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      const container = containerRef.current;
      const overlay = overlayRef.current;
      if (!container || !overlay) return;

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.set(overlay, { scaleY: 1, transformOrigin: "top" })
        .to(overlay, { scaleY: 0, duration: 0.55, ease: "power4.inOut" })
        .fromTo(
          container,
          { y: 22, opacity: 0, filter: "blur(5px)" },
          { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.5 },
          "-=0.32"
        );

      return () => {
        tl.kill();
      };
    },
    { dependencies: [pathname] }
  );

  return (
    <>
      <div
        ref={overlayRef}
        className="pointer-events-none fixed inset-0 z-[60] origin-top bg-gradient-to-b from-orange-200 via-orange-100 to-red-200"
      />
      <div ref={containerRef}>{children}</div>
    </>
  );
}
