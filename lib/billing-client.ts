"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";

const billingStatus = z.object({
  available: z.boolean(), plus: z.boolean(), manageable: z.boolean(), mode: z.enum(["test", "live"]).nullable(),
});
type BillingSnapshot = z.infer<typeof billingStatus> & { loading: boolean; error: boolean };
const initialStatus: BillingSnapshot = { available: false, plus: false, manageable: false, mode: null, loading: true, error: false };

export type BillingStatus = BillingSnapshot & { refresh: () => Promise<void> };

export function useBillingStatus(userId?: string | null, enabled = true): BillingStatus {
  const [checked, setChecked] = useState({ userId, ...initialStatus });
  const requestRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    try {
      const response = await fetch("/api/billing/status", { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error("Billing status unavailable");
      const status = billingStatus.parse(await response.json());
      if (!controller.signal.aborted) {
        setChecked({ userId, ...status, plus: Boolean(userId && status.plus), loading: false, error: false });
      }
    } catch {
      if (!controller.signal.aborted) setChecked({ userId, ...initialStatus, loading: false, error: true });
    }
  }, [enabled, userId]);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
    const check = () => { void refresh(); };
    window.addEventListener("focus", check);
    return () => {
      requestRef.current?.abort();
      window.removeEventListener("focus", check);
    };
  }, [enabled, refresh]);

  return { ...(checked.userId === userId ? checked : initialStatus), refresh };
}
