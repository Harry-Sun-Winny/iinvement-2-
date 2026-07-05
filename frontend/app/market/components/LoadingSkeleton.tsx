import React from "react";

export default function LoadingSkeleton() {
  return (
    <div className="space-y-4 py-4 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="grid grid-cols-5 items-center border-b border-white/5 py-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-white/5" />
            <div className="space-y-2">
              <div className="h-4 w-16 rounded bg-white/5" />
              <div className="h-3 w-24 rounded bg-white/5" />
            </div>
          </div>
          <div className="h-4 w-16 rounded bg-white/5 justify-self-end" />
          <div className="h-4 w-16 rounded bg-white/5 justify-self-end" />
          <div className="h-5 w-20 rounded-full bg-white/5 justify-self-end" />
          <div className="h-4 w-20 rounded bg-white/5 justify-self-end" />
        </div>
      ))}
    </div>
  );
}
