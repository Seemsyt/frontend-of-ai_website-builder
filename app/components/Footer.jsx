"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const quickLinks = [
  { label: "Features", href: "#features" },
  { label: "Templates", href: "#templates" },
  { label: "Pricing", href: "#pricing" },
  { label: "Get Started", href: "/?auth=login" },
];

export default function Footer() {
  const pathname = usePathname();
  if (pathname === "/generate") return null;

  return (
    <footer className="relative z-20 mt-16 border-t border-red-200/40 bg-gradient-to-b from-transparent via-red-100/20 to-red-200/25">
      <div className="mx-auto w-full max-w-6xl px-6 pb-8 pt-10 sm:px-10">
        <div className="footer-shell rounded-3xl px-6 py-8 sm:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.15em] text-orange-300">
              AI Website Builder
            </p>
            <h3 className="mt-3 text-2xl font-bold text-white">Build Better Websites Faster</h3>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-orange-100/90">
              Smart AI sections, fast publishing, and modern design blocks crafted for high
              conversion pages.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-orange-200">
              Contact
            </h4>
            <ul className="mt-4 space-y-3 text-sm text-white/90">
              <li>
                <span className="font-medium text-white">Email:</span>{" "}
                <a
                  href="mailto:hello@aiwebsitebuilder.dev"
                  className="transition hover:text-orange-200"
                >
                  seemsdev.vercel.app
                </a>
              </li>
              <li>
                <span className="font-medium text-white">Contact Number:</span>{" "}
                <a href="tel:+919876543210" className="transition hover:text-orange-200">
                  +91 xxxxxxxx
                </a>
              </li>
              <li>
                <span className="font-medium text-white">Instagram:</span>{" "}
                <a
                  href="https://www.instagram.com/seem.sdev/"
                  target="_blank"
                  rel="noreferrer"
                  className="transition hover:text-orange-200"
                >
                 Seems dev
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-orange-200">
              Quick Links
            </h4>
            <ul className="mt-4 space-y-3 text-sm text-white/90">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="transition hover:text-orange-200">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-white/15 pt-5">
          <p className="copyright-glow text-center text-xs font-semibold tracking-[0.12em]">
            © {new Date().getFullYear()} AI Website Builder. Crafted with precision.
          </p>
        </div>
      </div>
      </div>
    </footer>
  );
}
