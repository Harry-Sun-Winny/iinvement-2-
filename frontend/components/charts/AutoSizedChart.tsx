"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { ResponsiveContainer } from "recharts";

interface AutoSizedChartProps {
  children: ReactNode;
  className?: string;
}

export default function AutoSizedChart({ children, className = "" }: AutoSizedChartProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const updateSize = () => {
      const nextWidth = host.clientWidth;
      const nextHeight = host.clientHeight;

      setSize((current) => {
        if (current.width === nextWidth && current.height === nextHeight) {
          return current;
        }
        return { width: nextWidth, height: nextHeight };
      });
    };

    updateSize();

    const observer = new ResizeObserver(() => {
      updateSize();
    });

    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={hostRef} className={`h-full w-full min-w-0 min-h-[1px] ${className}`.trim()}>
      {size.width > 0 && size.height > 0 ? (
        <ResponsiveContainer width={size.width} height={size.height}>
          {children}
        </ResponsiveContainer>
      ) : null}
    </div>
  );
}
