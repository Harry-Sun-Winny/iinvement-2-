import React from "react";

interface MiniSparklineProps {
  points?: number[];
  positive?: boolean;
}

export default function MiniSparkline({ points = [], positive = true }: MiniSparklineProps) {
  if (points.length < 2) {
    return <div className="h-7 w-20 rounded-full bg-white/5" />;
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(max - min, 1);

  const path = points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * 100;
      const y = 28 - ((point - min) / range) * 24;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  const stroke = positive ? "var(--market-positive)" : "var(--market-negative)";

  return (
    <div className="h-7 w-20 opacity-90">
      <svg className="h-full w-full" viewBox="0 0 100 30" preserveAspectRatio="none">
        <path
          d={path}
          fill="none"
          stroke={stroke}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
