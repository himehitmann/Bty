import type { NextRequest } from "next/server";
import {
  BillingProblem, billingFailure, billingJson, findBillingCustomer, getBillingAdmin, getBillingSession,
  getStripe, requireBillingConfig, requireBillingMode, requireBillingOrigin, stripeRedirect,
} from "@/lib/billing-server";

export async function POST(request: NextRequest) {
  try {
    const billing = requireBillingConfig();
    requireBillingOrigin(request, billing);
    const session = await getBillingSession(request);
    if (!session) throw new BillingProblem(401, "Connecte-toi pour gérer ton abonnement Navier Plus.");

    try {
      const admin = getBillingAdmin(billing);
      await requireBillingMode(admin, billing.live);
      const customerId = await findBillingCustomer(admin, session.user.id, billing.live);
      if (!customerId) throw new BillingProblem(404, "Aucun compte de facturation n’est associé à cet espace.");
      const portal = await getStripe(billing).billingPortal.sessions.create({
        customer: customerId,
        return_url: `${billing.origin}/#offres`,
        locale: "fr",
      });
      return session.applyCookies(billingJson({ url: stripeRedirect(portal.url, "billing.stripe.com") }));
    } catch (error) {
      return session.applyCookies(billingFailure(error, "portal"));
    }
  } catch (error) {
    return billingFailure(error, "portal authentication");
  }
}
