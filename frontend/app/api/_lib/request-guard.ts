import { NextRequest, NextResponse } from "next/server";

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function clientAddress(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
}

export function rejectCrossSiteRequest(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).origin !== request.nextUrl.origin) {
        return NextResponse.json({ error: "Cross-site requests are not allowed." }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    }
  }

  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ error: "Cross-site requests are not allowed." }, { status: 403 });
  }

  return null;
}

export function enforceRateLimit(request: NextRequest, options: RateLimitOptions) {
  const now = Date.now();
  const bucketKey = `${options.key}:${clientAddress(request)}`;
  const current = buckets.get(bucketKey);

  if (!current || current.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + options.windowMs });
    return null;
  }

  if (current.count >= options.limit) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((current.resetAt - now) / 1000))) } },
    );
  }

  current.count += 1;
  return null;
}

export async function readJsonBody<T>(request: NextRequest, maxBytes: number): Promise<{ body: T } | { response: NextResponse }> {
  const declaredLength = Number(request.headers.get("content-length") || "0");
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return { response: NextResponse.json({ error: "Request body is too large." }, { status: 413 }) };
  }

  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > maxBytes) {
    return { response: NextResponse.json({ error: "Request body is too large." }, { status: 413 }) };
  }

  try {
    return { body: JSON.parse(text) as T };
  } catch {
    return { response: NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }) };
  }
}