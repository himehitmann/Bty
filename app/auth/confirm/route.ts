import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseConfig } from "@/lib/supabase/config";

const confirmationType = z.enum(["email", "signup", "magiclink"]);
const credential = z.string().min(16).max(512).regex(/^[a-z0-9._~-]+$/i);

export async function GET(request: NextRequest) {
  const config = getSupabaseConfig();
  const params = request.nextUrl.searchParams;
  const response = new NextResponse(null, {
    status: 303,
    headers: {
      Location: "/?auth=error",
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
  if (!config || ["code", "token_hash", "type"].some((name) => params.getAll(name).length > 1)) return response;

  const code = credential.safeParse(params.get("code"));
  const tokenHash = credential.safeParse(params.get("token_hash"));
  const type = confirmationType.safeParse(params.get("type"));
  if ((params.has("code") && params.has("token_hash")) || (!code.success && (!tokenHash.success || !type.success))) {
    return response;
  }

  const client = createServerClient(config.url, config.key, {
    cookieOptions: { secure: request.nextUrl.protocol === "https:" },
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

  try {
    const result = code.success
      ? await client.auth.exchangeCodeForSession(code.data)
      : tokenHash.success && type.success
        ? await client.auth.verifyOtp({ token_hash: tokenHash.data, type: type.data })
        : null;

    if (result && !result.error) response.headers.set("Location", "/?auth=confirmed");
  } catch {
    return response;
  }

  return response;
}
