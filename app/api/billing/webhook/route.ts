import type { NextRequest } from "next/server";
import type Stripe from "stripe";
import { z } from "zod";
import {
  BillingProblem, billingFailure, billingJson, getBillingAdmin, getStripe, matchesBillingPrice,
  readBillingBody, requireBillingConfig, requireBillingMode,
} from "@/lib/billing-server";

const subscriptionDelivery = z.object({
  eventId: z.string().max(255).regex(/^evt_[a-zA-Z0-9_]+$/),
  customerId: z.string().max(255).regex(/^cus_[a-zA-Z0-9_]+$/),
  subscriptionId: z.string().max(255).regex(/^sub_[a-zA-Z0-9_]+$/),
});

const subscriptionEvents = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
]);

function stripeId(value: string | { id: string } | null) {
  return typeof value === "string" ? value : value?.id;
}

function subscriptionReference(event: Stripe.Event) {
  if (subscriptionEvents.has(event.type)) {
    const subscription = event.data.object as Stripe.Subscription;
    return { subscriptionId: subscription.id, customerId: stripeId(subscription.customer) };
  }
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object;
    if (session.mode !== "subscription") return null;
    return { subscriptionId: stripeId(session.subscription), customerId: stripeId(session.customer) };
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const config = requireBillingConfig();
    const signature = request.headers.get("stripe-signature");
    if (!signature || signature.length > 2048) throw new BillingProblem(400, "Signature Stripe absente ou invalide.");

    const stripe = getStripe(config);
    const payload = await readBillingBody(request, 1024 * 1024);
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(payload, signature, config.webhookSecret);
    } catch {
      throw new BillingProblem(400, "Signature Stripe absente ou invalide.");
    }
    if (event.livemode !== config.live) throw new BillingProblem(400, "Mode Stripe inattendu.");

    const reference = subscriptionReference(event);
    if (!reference?.customerId || !reference.subscriptionId) return billingJson({ received: true });
    const delivery = subscriptionDelivery.safeParse({ ...reference, eventId: event.id });
    if (!delivery.success) throw new BillingProblem(400, "Identifiants Stripe invalides.");
    const { eventId, customerId, subscriptionId } = delivery.data;

    const admin = getBillingAdmin(config);
    await requireBillingMode(admin, config.live);
    const { data: version, error: beginError } = await admin.rpc("reserve_billing_event", {
      event_id: eventId,
      customer_id: customerId,
      request_live: config.live,
    });
    if (beginError) throw beginError;
    if (version == null) return billingJson({ received: true });

    // Read current Stripe state so delayed events cannot re-grant an ended subscription.
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    if (subscription.id !== subscriptionId || stripeId(subscription.customer) !== customerId || subscription.livemode !== config.live) {
      throw new Error("Unexpected subscription ownership or mode.");
    }

    const item = subscription.items.data.length === 1 && !subscription.items.has_more
      ? subscription.items.data[0] : undefined;
    const interval = item?.price.id === config.prices.monthly ? "monthly"
      : item?.price.id === config.prices.yearly ? "yearly" : null;
    const eligible = Boolean(item && interval && item.quantity === 1 && matchesBillingPrice(item.price, config, interval));
    const { error: applyError } = await admin.rpc("apply_billing_event", {
      event_id: eventId,
      customer_id: customerId,
      subscription_id: subscriptionId,
      request_live: config.live,
      observed_version: version,
      subscription_status: subscription.status,
      eligible_price: eligible,
      eligible_period_end: eligible && item ? new Date(item.current_period_end * 1000).toISOString() : null,
    });
    if (applyError) throw applyError;

    return billingJson({ received: true });
  } catch (error) {
    return billingFailure(error, "webhook");
  }
}
