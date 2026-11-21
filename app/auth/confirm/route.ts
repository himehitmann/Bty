import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseConfig, isSecureAuthOrigin, supabaseCookieOptions } from "@/lib/supabase/config";

const confirmationType = z.enum(["email", "signup", "magiclink", "recovery"]);
const credential = z.string().min(16).max(512).regex(/^[a-z0-9._~-]+$/i);
const pkceFlowId = z.string().regex(/^[a-zA-Z0-9_-]{8,64}$/);

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
  if (!config || !isSecureAuthOrigin(request.nextUrl) ||
    ["code", "token_hash", "type", "sb_flow_id"].some((name) => params.getAll(name).length > 1)) return response;

  const code = credential.safeParse(params.get("code"));
  const tokenHash = credential.safeParse(params.get("token_hash"));
  const type = confirmationType.safeParse(params.get("type"));
  const flow = pkceFlowId.safeParse(params.get("sb_flow_id"));
  const useCode = code.success && !params.has("token_hash") && (!params.has("sb_flow_id") || flow.success);
  const useOtp = !params.has("code") && tokenHash.success && type.success;
  if (!useCode && !useOtp) return response;

  const client = createServerClient(config.url, config.key, {
    cookieOptions: supabaseCookieOptions(request.nextUrl.protocol),
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
    if (useCode) {
      const result = await client.auth.exchangeCodeForSession(code.data, flow.success ? { flowId: flow.data } : undefined);
      if (!result.error && result.data.session) {
        const recovery = "redirectType" in result.data && result.data.redirectType === "recovery";
        response.headers.set("Location", recovery ? "/?auth=recovery" : "/?auth=confirmed");
      }
    } else if (useOtp) {
      const result = await client.auth.verifyOtp({ token_hash: tokenHash.data, type: type.data });
      if (!result.error && result.data.session) {
        response.headers.set("Location", type.data === "recovery" ? "/?auth=recovery" : "/?auth=confirmed");
      }
    }
  } catch {
    return response;
  }

  return response;
}
