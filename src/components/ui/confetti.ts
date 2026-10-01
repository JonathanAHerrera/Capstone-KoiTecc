export type CelebrationConfettiIntensity = "family" | "complete";

const CONFETTI_COLORS = ["#1e40af", "#58cc02", "#ffc800", "#1cb0f6", "#ffffff"];

export async function fireCelebrationConfetti({
  intensity,
}: {
  intensity: CelebrationConfettiIntensity;
}): Promise<void> {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const { default: confetti } = await import("canvas-confetti");
  const durationMs = intensity === "complete" ? 3000 : 1200;
  const particleCount = intensity === "complete" ? 7 : 4;
  const endTime = Date.now() + durationMs;

  const fireSideCannons = () => {
    confetti({
      particleCount,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors: CONFETTI_COLORS,
      disableForReducedMotion: true,
    });
    confetti({
      particleCount,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors: CONFETTI_COLORS,
      disableForReducedMotion: true,
    });
    if (Date.now() < endTime) requestAnimationFrame(fireSideCannons);
  };

  if (intensity === "complete") {
    confetti({
      particleCount: 160,
      spread: 90,
      startVelocity: 45,
      origin: { x: 0.5, y: 0.6 },
      colors: CONFETTI_COLORS,
      disableForReducedMotion: true,
    });
  }
  fireSideCannons();
}
