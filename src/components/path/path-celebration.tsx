"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { fireCelebrationConfetti, type CelebrationConfettiIntensity } from "@/components/ui/confetti";

export type PathCelebrationProps = {
  intensity: CelebrationConfettiIntensity | null;
};

export function PathCelebration({ intensity }: PathCelebrationProps) {
  const router = useRouter();
  const celebrationFiredRef = useRef(false);

  useEffect(() => {
    if (!intensity || celebrationFiredRef.current) return;
    celebrationFiredRef.current = true;
    void fireCelebrationConfetti({ intensity });
    router.replace("/path", { scroll: false });
  }, [intensity, router]);

  return null;
}
