"use client";

import { useState, useEffect, useRef } from "react";

interface ScoreDisplayProps {
  score: number;
  maxScore: number;
  animate?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function ScoreDisplay({
  score,
  maxScore,
  animate = true,
  size = "md",
}: ScoreDisplayProps) {
  const [displayScore, setDisplayScore] = useState(animate ? 0 : score);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!animate) {
      setDisplayScore(score);
      return;
    }

    setDisplayScore(0);
    startTimeRef.current = performance.now();
    const duration = 1500; // 1.5 seconds

    function tick(now: number) {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * score));

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(tick);
      }
    }

    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [score, animate]);

  function getScoreColor(s: number): string {
    if (maxScore <= 0) return "var(--text-secondary)";
    const ratio = s / maxScore;
    if (ratio >= 0.8) return "var(--accent-green)";
    if (ratio >= 0.4) return "var(--accent-amber)";
    return "var(--accent-red)";
  }

  const sizeClasses = {
    sm: "text-2xl",
    md: "text-5xl",
    lg: "text-7xl",
  };

  const maxSizeClasses = {
    sm: "text-sm",
    md: "text-xl",
    lg: "text-2xl",
  };

  return (
    <div className="flex items-baseline justify-center gap-1">
      <span
        className={`${sizeClasses[size]} font-bold tabular-nums tracking-tight`}
        style={{ color: getScoreColor(displayScore) }}
      >
        {displayScore}
      </span>
      <span
        className={`${maxSizeClasses[size]} font-medium`}
        style={{ color: "var(--text-secondary)" }}
      >
        /{maxScore}
      </span>
    </div>
  );
}
