import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  BillingProblem, billingFailure, billingJson, findBillingCustomer, getBillingAdmin, getBillingSession,
  getStripe, readBillingBody, requireBillingConfig, requireBillingMode, requireBillingOrigin, stripeRedirect, validateStripePrice,
} from "@/lib/billing-server";

const checkoutInput = z.strictObject({ interval: z.enum(["monthly", "yearly"]) });

export async function POST(request: NextRequest) {
  try {
    const billing = requireBillingConfig();
    requireBillingOrigin(request, billing);
    const session = await getBillingSession(request);
    if (!session) throw new BillingProblem(401, "Connecte-toi avant de choisir Navier Plus.");

    try {
      if (request.headers.get("content-type")?.split(";")[0] !== "application/json") {
        throw new BillingProblem(415, "Le format de cette demande est invalide.");
      }
      const raw = await readBillingBody(request, 1024);
      let payload: unknown;
      try { payload = JSON.parse(raw.toString("utf8")); }
      catch { throw new BillingProblem(400, "Le format de cette demande est invalide."); }
      const { data: input } = checkoutInput.safeParse(payload);
      if (!input) throw new BillingProblem(400, "Choisis une durée d’abonnement valide.");

      const stripe = getStripe(billing);
      const admin = getBillingAdmin(billing);
      await requireBillingMode(admin, billing.live);
      const price = await validateStripePrice(stripe, billing, input.interval);

      let customerId = await findBillingCustomer(admin, session.user.id, billing.live);
      if (!customerId) {
        const customer = await stripe.customers.create(
          { metadata: { navier_user_id: session.user.id } },
          { idempotencyKey: `navier-customer-${session.user.id}` },
        );
        const { error } = await admin.from("billing_customers")
          .upsert({ user_id: session.user.id, live_mode: billing.live, stripe_customer_id: customer.id }, {
            onConflict: "user_id,live_mode", ignoreDuplicates: true,
          });
        if (error) throw error;
        customerId = await findBillingCustomer(admin, session.user.id, billing.live);
        if (!customerId) throw new Error("Missing billing customer.");
      }

      const subscriptions = await stripe.subscriptions.list({ customer: customerId, limit: 100 });
      if (subscriptions.has_more || subscriptions.data.some(({ status }) => status !== "canceled" && status !== "incomplete_expired")) {
        throw new BillingProblem(409, "Ce compte possède déjà un abonnement. Ouvre la gestion de l’abonnement Stripe.");
      }

      const nonce = crypto.randomUUID();
      const { data: leaseData, error: leaseError } = await admin.rpc("claim_billing_checkout", {
        account_id: session.user.id, claim_id: nonce, request_live: billing.live,
      }).single();
      if (leaseError) throw leaseError;
      const lease = z.object({ claimed: z.boolean(), session_id: z.string().nullable() }).parse(leaseData);

      if (!lease.claimed) {
        if (lease.session_id) {
          const existing = await stripe.checkout.sessions.retrieve(lease.session_id, { expand: ["line_items"] });
          const items = existing.line_items;
          if (existing.customer === customerId && existing.livemode === billing.live && existing.mode === "subscription" &&
            existing.status === "open" && items?.data.length === 1 && !items.has_more &&
            items.data[0]?.price?.id === price.id && items.data[0].quantity === 1) {
            return session.applyCookies(billingJson({ url: stripeRedirect(existing.url, "checkout.stripe.com") }));
          }
        }
        throw new BillingProblem(409, "Un paiement est déjà ouvert ou en cours de préparation. Réessaie avec la même offre ou attends son expiration.");
      }

      const checkout = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        currency: "eur",
        adaptive_pricing: { enabled: false },
        line_items: [{ price: price.id, quantity: 1 }],
        metadata: { interval: input.interval },
        success_url: `${billing.origin}/?billing=success#offres`,
        cancel_url: `${billing.origin}/?billing=cancel#offres`,
        expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
        locale: "fr",
      }, { idempotencyKey: `navier-checkout-${nonce}` });
      try {
        const url = stripeRedirect(checkout.url, "checkout.stripe.com");
        const { data: recorded, error: recordError } = await admin.from("billing_customers")
          .update({ checkout_session_id: checkout.id }).eq("user_id", session.user.id)
          .eq("live_mode", billing.live).eq("checkout_nonce", nonce).select("checkout_session_id").maybeSingle();
        if (recordError || recorded?.checkout_session_id !== checkout.id) {
          throw recordError ?? new Error("Could not associate the new checkout with the billing customer.");
        }
        return session.applyCookies(billingJson({ url }));
      } catch (error) {
        // Do not give out a checkout URL until this lease owns the stored session.
        await stripe.checkout.sessions.expire(checkout.id).catch(() => {});
        throw error;
      }
    } catch (error) {
      return session.applyCookies(billingFailure(error, "checkout"));
    }
  } catch (error) {
    return billingFailure(error, "checkout authentication");
  }
}
