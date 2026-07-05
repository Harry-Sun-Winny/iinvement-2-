import React from "react";

export default function MiniSparkline() {
  return (
    <div className="h-6 w-16 opacity-60">
      <svg className="h-full w-full" viewBox="0 0 100 30">
        <path
          d="M0 25 Q15 5, 30 15 T60 10 T90 5 T100 15"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}
