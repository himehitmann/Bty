import type { NextRequest } from "next/server";
import {
  billingFailure, billingJson, getBillingConfig, getBillingEntitlement, getBillingSession,
} from "@/lib/billing-server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const config = getBillingConfig();
  const availability = { available: Boolean(config), mode: config ? (config.live ? "live" : "test") : null };
  try {
    const session = await getBillingSession(request);
    if (!session) return billingJson({ ...availability, plus: false, manageable: false });
    const entitlement = await getBillingEntitlement(session.client);
    return session.applyCookies(billingJson({ ...availability, ...entitlement }));
  } catch (error) {
    return billingFailure(error, "status");
  }
}
