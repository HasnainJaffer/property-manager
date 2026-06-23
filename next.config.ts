import type { NextConfig } from "next";

// Supabase project URL — used in both HTTPS and WSS forms.
// WSS is required for Supabase Realtime (WebSocket connections).
const SUPABASE_ORIGIN = "https://osvaxlexuhsgacbwqowj.supabase.co";
const SUPABASE_WS     = "wss://osvaxlexuhsgacbwqowj.supabase.co";

const isDev = process.env.NODE_ENV === "development";

const csp = [
  // Fallback for any directive not listed below
  "default-src 'self'",

  // Next.js injects inline <script> tags for hydration data (__NEXT_DATA__),
  // so 'unsafe-inline' is required. 'unsafe-eval' is added in development only
  // because React dev mode uses eval() for call-stack reconstruction — React
  // never uses eval() in production, so it is safe to omit it there.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,

  // Next.js and Tailwind inject <style> blocks; Framer Motion sets inline
  // style attributes via the DOM API (covered by script-src, not this).
  "style-src 'self' 'unsafe-inline'",

  // next/font/google self-hosts all font files at build time under /_next/static/,
  // so no external font domains are needed.
  "font-src 'self'",

  // Local images + data URIs (base64 SVGs, favicons) + blob URIs.
  // Supabase Storage is included for any uploaded property/document images.
  `img-src 'self' data: blob: ${SUPABASE_ORIGIN}`,

  // Browser → Supabase (REST + Auth) and Supabase Realtime (WebSocket).
  `connect-src 'self' ${SUPABASE_ORIGIN} ${SUPABASE_WS}`,

  // No external iframes
  "frame-src 'none'",

  // Prevents this app from being embedded in a frame on any external site
  "frame-ancestors 'none'",

  // Locks down <base> tag hijacking
  "base-uri 'self'",

  // Only allow form submissions to same-origin endpoints
  "form-action 'self'",

  // Block Flash, Java, and other plugins
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: csp,
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply to every route including API routes, static assets, and pages
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
