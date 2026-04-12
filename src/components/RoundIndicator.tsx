"use client";

interface RoundScore {
  score: number;
  maxScore: number;
}

interface RoundIndicatorProps {
  currentRound: number; // 0-indexed
  totalRounds: number;
  roundScores: (RoundScore | null)[]; // null = not yet played
}

export default function RoundIndicator({
  currentRound,
  totalRounds,
  roundScores,
}: RoundIndicatorProps) {
  function getDotColor(index: number): string {
    const rs = roundScores[index];
    if (!rs) {
      // Not played yet
      if (index === currentRound) return "var(--accent-cyan)";
      return "transparent";
    }
    const ratio = rs.score / rs.maxScore;
    if (ratio >= 0.8) return "var(--accent-green)";
    if (ratio >= 0.4) return "var(--accent-amber)";
    return "var(--accent-red)";
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
        Round {currentRound + 1}/{totalRounds}
      </span>
      <div className="flex gap-2">
        {Array.from({ length: totalRounds }, (_, i) => {
          const played = roundScores[i] !== null;
          const isCurrent = i === currentRound;
          const dotColor = getDotColor(i);

          return (
            <div
              key={i}
              className="w-3 h-3 rounded-full transition-all duration-300"
              style={{
                background: played || isCurrent ? dotColor : "transparent",
                border: `2px solid ${
                  played
                    ? dotColor
                    : isCurrent
                    ? "var(--accent-cyan)"
                    : "rgba(255,255,255,0.2)"
                }`,
                boxShadow:
                  isCurrent && !played
                    ? "0 0 8px rgba(0, 240, 255, 0.5)"
                    : "none",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
