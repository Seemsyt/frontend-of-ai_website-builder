"use client";

import { motion } from "motion/react";
import { usePathname } from "next/navigation";

const fallingLights = [
  { left: "8%", size: 8, delay: 0, duration: 7.5, opacity: 0.6, blur: "blur-[1px]" },
  { left: "16%", size: 6, delay: 1.1, duration: 9.2, opacity: 0.5, blur: "blur-[1px]" },
  { left: "24%", size: 9, delay: 0.6, duration: 8.4, opacity: 0.65, blur: "blur-sm" },
  { left: "36%", size: 7, delay: 1.8, duration: 7.8, opacity: 0.54, blur: "blur-[1px]" },
  { left: "48%", size: 10, delay: 0.9, duration: 9.5, opacity: 0.52, blur: "blur-sm" },
  { left: "60%", size: 7, delay: 0.2, duration: 8.8, opacity: 0.56, blur: "blur-[1px]" },
  { left: "70%", size: 8, delay: 1.4, duration: 7.4, opacity: 0.62, blur: "blur-sm" },
  { left: "82%", size: 6, delay: 0.5, duration: 9.1, opacity: 0.48, blur: "blur-[1px]" },
  { left: "92%", size: 9, delay: 1.6, duration: 8.2, opacity: 0.58, blur: "blur-sm" },
];

const Spotlight = () => {
  const pathname = usePathname();
  if (pathname === "/generate") return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <motion.div
        className="absolute left-1/2 top-[-12rem] h-[30rem] w-[38rem] -translate-x-1/2 rounded-full bg-orange-300/45 blur-[130px]"
        animate={{ opacity: [0.35, 0.62, 0.35], scale: [0.95, 1.08, 0.95] }}
        transition={{ duration: 8.5, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute right-[8%] top-[5%] h-80 w-80 rounded-full bg-red-500/38 blur-[120px]"
        animate={{ opacity: [0.28, 0.52, 0.28], x: [0, -16, 0], y: [0, 12, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      {fallingLights.map((light, index) => (
        <motion.div
          key={`${light.left}-${index}`}
          className={`absolute top-[-12%] rounded-full bg-gradient-to-b from-orange-50 via-orange-200 to-red-500 shadow-[0_0_18px_rgba(251,146,60,0.55)] ${light.blur}`}
          style={{
            left: light.left,
            width: `${light.size}px`,
            height: `${light.size * 5}px`,
            opacity: light.opacity,
          }}
          animate={{ y: ["0vh", "120vh"], x: [0, index % 2 === 0 ? 12 : -10, 0] }}
          transition={{
            duration: light.duration,
            delay: light.delay,
            repeat: Infinity,
            repeatType: "loop",
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
};

export default Spotlight;
