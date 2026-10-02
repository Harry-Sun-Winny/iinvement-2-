import type { NextConfig } from "next";

const backendOrigin = process.env.BACKEND_API_URL || "http://127.0.0.1:8080";
const backendUrl = new URL(backendOrigin);
const isLocalBackend = backendUrl.hostname === "localhost" || backendUrl.hostname === "127.0.0.1";

if (process.env.NODE_ENV === "production" && !isLocalBackend && backendUrl.protocol !== "https:") {
  throw new Error("BACKEND_API_URL must use HTTPS in production.");
}

const nextConfig: NextConfig = {
  // Keep the framework development toolbar from covering sidebar actions.
  devIndicators: false,
  // Never let `next build` overwrite manifests and CSS used by a running
  // development server. This was the cause of the unstyled HTML screen.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next-build",
  turbopack: {
    root: process.cwd(),
  },
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: `${backendOrigin}/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https:;" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
