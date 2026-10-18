export type CelebrationConfettiIntensity = "family" | "complete";

const GUSTO_RAINBOW = ["#2dd4bf", "#38bdf8", "#818cf8", "#fbbf24", "#a5b4fc"];

export async function fireCelebrationConfetti({
  intensity,
}: {
  intensity: CelebrationConfettiIntensity;
}): Promise<void> {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const { default: confetti } = await import("canvas-confetti");
  const particleBudget = intensity === "complete" ? 220 : 140;
  const origin = { x: 0.5, y: intensity === "complete" ? 0.55 : 0.6 };

  const burst = (particleRatio: number, options: confetti.Options) =>
    confetti({
      particleCount: Math.floor(particleBudget * particleRatio),
      origin,
      colors: GUSTO_RAINBOW,
      shapes: ["star", "circle"],
      scalar: 1.2,
      ticks: 220,
      gravity: 0.6,
      disableForReducedMotion: true,
      ...options,
    });

  burst(0.25, { spread: 26, startVelocity: 55 });
  burst(0.2, { spread: 60 });
  burst(0.35, { spread: 100, decay: 0.91, scalar: 0.9 });
  burst(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.4 });
  burst(0.1, { spread: 120, startVelocity: 45 });

  if (intensity === "complete") {
    window.setTimeout(() => {
      burst(0.3, { spread: 160, startVelocity: 35, origin: { x: 0.2, y: 0.5 } });
      burst(0.3, { spread: 160, startVelocity: 35, origin: { x: 0.8, y: 0.5 } });
    }, 500);
  }
}
