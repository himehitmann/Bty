import type { NextConfig } from "next";

function isPublicSupabaseKey(key: string) {
  if (/^sb_publishable_[a-zA-Z0-9_-]+$/.test(key)) return true;
  if (!/^[\w-]+\.[\w-]+\.[\w-]+$/.test(key)) return false;
  try {
    return JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString("utf8"))?.role === "anon";
  } catch {
    return false;
  }
}

const publicSupabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (publicSupabaseKey && !isPublicSupabaseKey(publicSupabaseKey)) {
  throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be a Supabase publishable key or legacy anon key.");
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=()" },
        ],
      },
      {
        source: "/auth/confirm",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'none'; connect-src 'self'" },
        ],
      },
      {
        source: "/offline.html",
        headers: [{ key: "Content-Security-Policy", value: "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'" }],
      },
    ];
  },
};

export default nextConfig;
