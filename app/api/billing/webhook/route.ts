import type { NextRequest } from "next/server";
import type Stripe from "stripe";
import {
  BillingProblem, billingFailure, billingJson, getBillingAdmin, getStripe, readBillingBody, requireBillingConfig, requireBillingMode,
} from "@/lib/billing-server";
import { billingPlans } from "@/lib/billing-plans";

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

    const admin = getBillingAdmin(config);
    await requireBillingMode(admin, config.live);
    const { data: version, error: beginError } = await admin.rpc("begin_billing_reconciliation", {
      customer_id: reference.customerId,
      subscription_id: reference.subscriptionId,
      request_live: config.live,
    });
    if (beginError) throw beginError;
    if (version == null) return billingJson({ received: true });

    // Read current Stripe state so delayed events cannot re-grant an ended subscription.
    const subscription = await stripe.subscriptions.retrieve(reference.subscriptionId);
    if (stripeId(subscription.customer) !== reference.customerId || subscription.livemode !== config.live) {
      throw new Error("Unexpected subscription ownership or mode.");
    }

    const item = subscription.items.data.length === 1 && !subscription.items.has_more
      ? subscription.items.data[0] : undefined;
    const interval = item?.price.id === config.prices.monthly ? "monthly"
      : item?.price.id === config.prices.yearly ? "yearly" : null;
    const plan = interval ? billingPlans[interval] : null;
    const eligible = Boolean(item && plan && item.quantity === 1 && item.price.currency === "eur" &&
      item.price.unit_amount === plan.amount && item.price.recurring?.interval === plan.interval &&
      item.price.recurring.interval_count === 1);
    const { error: applyError } = await admin.from("billing_subscriptions").update({
      status: subscription.status,
      plus_price: eligible,
      period_end: item ? new Date(item.current_period_end * 1000).toISOString() : null,
    }).eq("stripe_subscription_id", subscription.id).eq("reconciliation_version", version);
    if (applyError) throw applyError;

    return billingJson({ received: true });
  } catch (error) {
    return billingFailure(error, "webhook");
  }
}
