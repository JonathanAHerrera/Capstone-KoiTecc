"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, type MouseEvent, type ReactNode } from "react";

export type ClickSparkHandle = {
  fireSparkBurst: (position?: { x: number; y: number }) => void;
};

export type ClickSparkProps = {
  sparkColor?: string;
  sparkSize?: number;
  sparkRadius?: number;
  sparkCount?: number;
  duration?: number;
  easing?: "linear" | "ease-in" | "ease-out" | "ease-in-out";
  extraScale?: number;
  sparkOnClick?: boolean;
  className?: string;
  children?: ReactNode;
};

type Spark = {
  x: number;
  y: number;
  angle: number;
  startTime: number;
};

export const ClickSpark = forwardRef<ClickSparkHandle, ClickSparkProps>(function ClickSpark(
  {
    sparkColor = "#fff",
    sparkSize = 10,
    sparkRadius = 15,
    sparkCount = 8,
    duration = 400,
    easing = "ease-out",
    extraScale = 1.0,
    sparkOnClick = true,
    className = "",
    children,
  },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparksRef = useRef<Spark[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;

    let resizeTimeout: ReturnType<typeof setTimeout>;
    const resizeCanvas = () => {
      const { width, height } = parent.getBoundingClientRect();
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
    };
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(resizeCanvas, 100);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(parent);
    resizeCanvas();
    return () => {
      resizeObserver.disconnect();
      clearTimeout(resizeTimeout);
    };
  }, []);

  const easeProgress = useCallback(
    (progress: number) => {
      switch (easing) {
        case "linear":
          return progress;
        case "ease-in":
          return progress * progress;
        case "ease-in-out":
          return progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
        default:
          return progress * (2 - progress);
      }
    },
    [easing],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    let animationFrameId: number;
    const draw = (timestamp: number) => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      sparksRef.current = sparksRef.current.filter((spark) => {
        const elapsed = timestamp - spark.startTime;
        if (elapsed >= duration) return false;
        const eased = easeProgress(elapsed / duration);
        const distance = eased * sparkRadius * extraScale;
        const lineLength = sparkSize * (1 - eased);
        context.strokeStyle = sparkColor;
        context.lineWidth = 2;
        context.lineCap = "round";
        context.beginPath();
        context.moveTo(spark.x + distance * Math.cos(spark.angle), spark.y + distance * Math.sin(spark.angle));
        context.lineTo(
          spark.x + (distance + lineLength) * Math.cos(spark.angle),
          spark.y + (distance + lineLength) * Math.sin(spark.angle),
        );
        context.stroke();
        return true;
      });
      animationFrameId = requestAnimationFrame(draw);
    };
    animationFrameId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animationFrameId);
  }, [sparkColor, sparkSize, sparkRadius, sparkCount, duration, easeProgress, extraScale]);

  const fireSparkBurst = useCallback(
    (position?: { x: number; y: number }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const { x, y } = position ?? { x: canvas.width / 2, y: canvas.height / 2 };
      const now = performance.now();
      sparksRef.current.push(
        ...Array.from({ length: sparkCount }, (_, sparkIndex) => ({
          x,
          y,
          angle: (2 * Math.PI * sparkIndex) / sparkCount,
          startTime: now,
        })),
      );
    },
    [sparkCount],
  );

  useImperativeHandle(ref, () => ({ fireSparkBurst }), [fireSparkBurst]);

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!sparkOnClick || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    fireSparkBurst({ x: event.clientX - rect.left, y: event.clientY - rect.top });
  };

  return (
    <div className={`relative ${className}`} onClick={handleClick}>
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-10" aria-hidden />
      {children}
    </div>
  );
});
