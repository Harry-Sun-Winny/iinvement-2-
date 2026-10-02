"use client";

import { useEffect, useState } from "react";

const logoCache = new Map<string, string>();
const logoRequests = new Map<string, Promise<string>>();

function normalizeSymbol(symbol: string) {
  return symbol.trim().toUpperCase();
}

function getFallbackLabel(symbol: string) {
  const baseSymbol = normalizeSymbol(symbol).split(/[-.=^]/)[0];
  return (baseSymbol || "?").slice(0, 2);
}

async function fetchAssetLogo(symbol: string) {
  const normalizedSymbol = normalizeSymbol(symbol);
  if (!normalizedSymbol) return "";
  if (logoCache.has(normalizedSymbol)) return logoCache.get(normalizedSymbol) ?? "";

  const pendingRequest = logoRequests.get(normalizedSymbol);
  if (pendingRequest) return pendingRequest;

  const request = fetch(`/api/stock-news?symbol=${encodeURIComponent(normalizedSymbol)}&crawl=1`)
    .then(async (response) => {
      if (!response.ok) return "";
      const profile = await response.json();
      return typeof profile?.logo === "string" ? profile.logo.trim() : "";
    })
    .catch(() => "")
    .then((logo) => {
      logoCache.set(normalizedSymbol, logo);
      logoRequests.delete(normalizedSymbol);
      return logo;
    });

  logoRequests.set(normalizedSymbol, request);
  return request;
}

interface AssetLogoProps {
  symbol: string;
  name?: string;
  className?: string;
}

export function AssetLogo({ symbol, name, className = "h-8 w-8" }: AssetLogoProps) {
  const normalizedSymbol = normalizeSymbol(symbol);
  const cachedLogo = logoCache.get(normalizedSymbol) ?? "";
  const [logo, setLogo] = useState(cachedLogo);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setLogo(logoCache.get(normalizedSymbol) ?? "");
    setImageFailed(false);

    void fetchAssetLogo(normalizedSymbol).then((nextLogo) => {
      if (active) setLogo(nextLogo);
    });

    return () => {
      active = false;
    };
  }, [normalizedSymbol]);

  const accessibleName = name?.trim() || normalizedSymbol;

  return (
    <span
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-slate-950 text-[10px] font-black uppercase text-cyan-300 shadow-inner ${className}`}
    >
      <span
        aria-hidden={logo && !imageFailed ? true : undefined}
        aria-label={logo && !imageFailed ? undefined : `${accessibleName} logo`}
        role={logo && !imageFailed ? undefined : "img"}
      >
        {getFallbackLabel(normalizedSymbol)}
      </span>
      {logo && !imageFailed ? (
        <img
          src={logo}
          alt={`${accessibleName} logo`}
          className="absolute inset-0 h-full w-full bg-white object-contain p-1"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
        />
      ) : null}
    </span>
  );
}
