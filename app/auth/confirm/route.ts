import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseConfig } from "@/lib/supabase/config";

const confirmationType = z.enum(["email", "signup", "magiclink"]);

export async function GET(request: NextRequest) {
  const config = getSupabaseConfig();
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = confirmationType.safeParse(request.nextUrl.searchParams.get("type"));
  const destination = request.nextUrl.clone();
  destination.pathname = "/";
  destination.search = "";
  destination.searchParams.set("auth", "error");

  const response = NextResponse.redirect(destination);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  if (!config) return response;

  const client = createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
      },
    },
  });

  const result = code
    ? await client.auth.exchangeCodeForSession(code)
    : tokenHash && type.success
      ? await client.auth.verifyOtp({ token_hash: tokenHash, type: type.data })
      : null;

  if (result && !result.error) {
    destination.searchParams.set("auth", "confirmed");
    response.headers.set("Location", destination.toString());
  }

  return response;
}
