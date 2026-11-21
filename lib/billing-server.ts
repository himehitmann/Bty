import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";
import { getSupabaseConfig, isSecureAuthOrigin, supabaseCookieOptions } from "@/lib/supabase/config";
import { billingPlans, type BillingEntitlement, type BillingInterval } from "@/lib/billing-plans";

const priceId = z.string().regex(/^price_[a-zA-Z0-9]+$/);

export class BillingProblem extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export function getBillingConfig() {
  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = getSupabaseConfig();
  const monthly = priceId.safeParse(process.env.STRIPE_PRICE_MONTHLY);
  const yearly = priceId.safeParse(process.env.STRIPE_PRICE_YEARLY);
  if (!secret || !/^sk_(test|live)_[a-zA-Z0-9]+$/.test(secret) ||
    !webhookSecret || !/^whsec_[a-zA-Z0-9]+$/.test(webhookSecret) || !serviceKey || !supabase ||
    serviceKey === supabase.key ||
    !monthly.success || !yearly.success || monthly.data === yearly.data) return null;

  const live = secret.startsWith("sk_live_");
  if (live && process.env.NAVIER_BILLING_ALLOW_LIVE !== "true") return null;

  const site = process.env.NAVIER_PUBLIC_URL;
  if (!site) return null;
  try {
    const url = new URL(site);
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash ||
      !isSecureAuthOrigin(url) || (live && url.protocol !== "https:")) return null;

    return { secret, webhookSecret, supabaseUrl: supabase.url, serviceKey, live, origin: url.origin,
      prices: { monthly: monthly.data, yearly: yearly.data } };
  } catch {
    return null;
  }
}

export type BillingConfig = NonNullable<ReturnType<typeof getBillingConfig>>;

export function requireBillingConfig() {
  const billing = getBillingConfig();
  if (!billing) throw new BillingProblem(503, "Le paiement Navier Plus est indisponible pour le moment.");
  return billing;
}

export function requireBillingOrigin(request: NextRequest, billing: BillingConfig) {
  if (request.headers.get("origin") !== billing.origin) {
    throw new BillingProblem(403, "Cette demande de paiement doit provenir de Navier.");
  }
}

export function getStripe(billing: BillingConfig) {
  return new Stripe(billing.secret, { timeout: 10_000, maxNetworkRetries: 1 });
}

export function getBillingAdmin(billing: BillingConfig) {
  return createClient(billing.supabaseUrl, billing.serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

export async function requireBillingMode(admin: SupabaseClient, live: boolean) {
  const { data, error } = await admin.from("billing_settings").select("live_mode").eq("singleton", true).single();
  if (error) throw error;
  if (data.live_mode !== live) {
    throw new BillingProblem(503, "La configuration de paiement est indisponible pour le moment.");
  }
}

export async function getBillingSession(request: NextRequest) {
  const supabase = getSupabaseConfig();
  if (!supabase || !isSecureAuthOrigin(request.nextUrl) || !request.cookies.getAll().some(({ name }) =>
    name === supabase.authCookieName || name.startsWith(`${supabase.authCookieName}.`))) return null;

  const cookies: { name: string; value: string; options: CookieOptions }[] = [];
  const client = createServerClient(supabase.url, supabase.key, {
    cookieOptions: supabaseCookieOptions(request.nextUrl.protocol),
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (nextCookies) => {
        for (const cookie of nextCookies) request.cookies.set(cookie.name, cookie.value);
        cookies.push(...nextCookies);
      },
    },
  });
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return null;

  return {
    user, client,
    applyCookies(response: NextResponse) {
      for (const { name, value, options } of cookies) response.cookies.set(name, value, options);
      return response;
    },
  };
}

export async function getBillingEntitlement(client: SupabaseClient): Promise<BillingEntitlement> {
  const { data, error } = await client.rpc("get_billing_entitlement").single();
  if (error) throw error;
  return z.object({ plus: z.boolean(), manageable: z.boolean() }).parse(data);
}

export function billingJson<T>(data: T, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" },
  });
}

export function billingFailure(error: unknown, action: string) {
  if (error instanceof BillingProblem) return billingJson({ error: error.message }, error.status);
  console.error(`Navier billing: ${action} failed.`);
  return billingJson({ error: "Cette opération n’a pas pu aboutir. Réessaie dans un instant." }, 502);
}

export async function readBillingBody(request: NextRequest, maxBytes: number) {
  const tooLarge = () => new BillingProblem(413, "La requête dépasse la taille autorisée.");
  if (Number(request.headers.get("content-length")) > maxBytes) throw tooLarge();
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);

  const read = async () => {
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > maxBytes) throw tooLarge();
      chunks.push(value);
    }
    return Buffer.concat(chunks, length);
  };

  let deadline: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    deadline = setTimeout(() => reject(new BillingProblem(408, "La lecture de la requête a expiré.")), 10_000);
  });
  try {
    return await Promise.race([read(), timeout]);
  } finally {
    clearTimeout(deadline);
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export function stripeRedirect(url: string | null, host: "checkout.stripe.com" | "billing.stripe.com") {
  if (url) {
    const parsed = new URL(url);
    if (parsed.origin === `https://${host}` && !parsed.username && !parsed.password) return url;
  }
  throw new BillingProblem(502, "Le lien Stripe n’a pas pu être créé.");
}

export function matchesBillingPrice(price: Stripe.Price, billing: BillingConfig, interval: BillingInterval) {
  const plan = billingPlans[interval];
  return price.id === billing.prices[interval] && price.livemode === billing.live && price.currency === "eur" &&
    price.type === "recurring" && price.billing_scheme === "per_unit" && !price.transform_quantity &&
    price.unit_amount === plan.amount && price.recurring?.interval === plan.interval &&
    price.recurring.interval_count === 1 && price.recurring.usage_type === "licensed";
}

export async function validateStripePrice(stripe: Stripe, billing: BillingConfig, interval: BillingInterval) {
  const price = await stripe.prices.retrieve(billing.prices[interval]);
  if (!price.active || !matchesBillingPrice(price, billing, interval)) {
    throw new BillingProblem(503, "Le prix de cette offre n’est pas disponible. Aucun paiement n’a été ouvert.");
  }
  return price;
}

export async function findBillingCustomer(admin: SupabaseClient, userId: string, live: boolean) {
  const { data, error } = await admin.from("billing_customers").select("stripe_customer_id")
    .eq("user_id", userId).eq("live_mode", live).maybeSingle();
  if (error) throw error;
  return data?.stripe_customer_id as string | undefined;
}
