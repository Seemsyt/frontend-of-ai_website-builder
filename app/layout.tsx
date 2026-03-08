import type { Metadata } from "next";
import "./globals.css";
import Spotlight from "./components/Spotlight";
import Navbar from "./components/Navbar";
import PageTransition from "./components/PageTransition";
import Footer from "./components/Footer";
import AuthModalWrapper from "./components/AuthModalWrapper";

export const metadata: Metadata = {
  title: "AI Website Builder",
  description: "Build and launch websites faster with AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <main className="relative min-h-screen overflow-x-hidden bg-linear-to-br from-white via-orange-50 to-red-100">
        
          <Navbar />
          <PageTransition>{children}</PageTransition>
          <Footer />
          <AuthModalWrapper />
        </main>
      </body>
    </html>
  );
}
