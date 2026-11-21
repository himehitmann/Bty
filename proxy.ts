import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { catalogImageCspSources } from "@/lib/catalog-images";
import { getSupabaseConfig, isSecureAuthOrigin, supabaseCookieOptions } from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
  const config = getSupabaseConfig();
  const development = process.env.NODE_ENV === "development";
  const nonce = crypto.randomUUID().replaceAll("-", "");
  const scriptSources = ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"];
  const connectSources = ["'self'"];
  if (config) connectSources.push(config.origin);
  if (development) {
    scriptSources.push("'unsafe-eval'");
    connectSources.push("ws:", "wss:");
  }

  const policy = [
    "default-src 'self'",
    `script-src ${scriptSources.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    ...(!development ? [`style-src-elem 'self' 'nonce-${nonce}'`] : []),
    `img-src 'self' data: blob: ${catalogImageCspSources.join(" ")}`,
    "font-src 'self'",
    `connect-src ${connectSources.join(" ")}`,
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    ...(!development && request.nextUrl.protocol === "https:" ? ["upgrade-insecure-requests"] : []),
  ].join("; ");

  function next() {
    const headers = new Headers(request.headers);
    headers.set("x-nonce", nonce);
    headers.set("Content-Security-Policy", policy);
    const response = NextResponse.next({ request: { headers } });
    response.headers.set("Content-Security-Policy", policy);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }

  let response = next();
  if (request.nextUrl.pathname !== "/" || !config || !isSecureAuthOrigin(request.nextUrl) ||
    !request.cookies.getAll().some(({ name }) => name === config.authCookieName || name.startsWith(`${config.authCookieName}.`))) {
    return response;
  }

  const client = createServerClient(config.url, config.key, {
    cookieOptions: supabaseCookieOptions(request.nextUrl.protocol),
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);

        response = next();
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
      },
    },
  });

  await client.auth.getClaims().catch(() => undefined);
  return response;
}

export const config = { matcher: ["/", "/decouvrir", "/installer", "/confidentialite"] };
