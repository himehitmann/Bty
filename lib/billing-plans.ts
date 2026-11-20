export const billingPlans = {
  monthly: { amount: 399, interval: "month", label: "3,99 €", period: "par mois" },
  yearly: { amount: 2999, interval: "year", label: "29,99 €", period: "par an" },
} as const;

export type BillingInterval = keyof typeof billingPlans;
export type BillingEntitlement = { plus: boolean; manageable: boolean };
