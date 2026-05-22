import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  forceApplyPurchase,
  getLatestPurchaseStatus,
} from "@/lib/payments.functions";

const STORAGE_KEY = "rp_pending_purchase_ref";
const POLL_INTERVAL_MS = 2000;
const MAX_ATTEMPTS = 15; // ~30s

export function setPendingPurchaseRef(reference: string) {
  try {
    localStorage.setItem(STORAGE_KEY, reference);
  } catch {
    /* ignore */
  }
}

function clearPendingRef() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function PaymentSyncWatcher() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const getStatus = useServerFn(getLatestPurchaseStatus);
  const forceApply = useServerFn(forceApplyPurchase);
  const runningRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    if (typeof window === "undefined") return;
    if (runningRef.current) return;

    const reference = (() => {
      try {
        return localStorage.getItem(STORAGE_KEY);
      } catch {
        return null;
      }
    })();
    if (!reference) return;

    runningRef.current = true;
    let cancelled = false;

    const showSuccess = () => {
      toast.success("✅ Accès IA débloqué avec succès");
      queryClient.invalidateQueries({ queryKey: ["user-stats"] });
      queryClient.invalidateQueries({ queryKey: ["account"] });
      clearPendingRef();
    };

    const showManualUnlock = () => {
      toast.error("Le déblocage a pris plus de temps que prévu.", {
        duration: Infinity,
        id: `manual-unlock-${reference}`,
        action: {
          label: "Mon accès n'est pas débloqué",
          onClick: async () => {
            try {
              const res = await forceApply({ data: { reference } });
              if (res.applied) {
                showSuccess();
                toast.dismiss(`manual-unlock-${reference}`);
              } else if (res.status === "pending") {
                toast.message(
                  "Paiement encore en attente côté Taramoney. Réessaye dans un instant."
                );
              } else {
                toast.error(
                  "Aucun paiement confirmé pour cette commande. Contacte le support si tu as bien payé."
                );
              }
            } catch (e) {
              console.error(e);
              toast.error("Erreur lors du déblocage manuel.");
            }
          },
        },
      });
    };

    const poll = async () => {
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        if (cancelled) return;
        try {
          const row = await getStatus({ data: { reference } });
          if (row?.status === "success") {
            // Make sure benefits are applied (idempotent).
            try {
              await forceApply({ data: { reference } });
            } catch {
              /* ignore */
            }
            showSuccess();
            return;
          }
          if (row?.status === "failure") {
            toast.error("Paiement échoué.");
            clearPendingRef();
            return;
          }
        } catch (e) {
          console.warn("Polling purchase status failed:", e);
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }
      if (!cancelled) showManualUnlock();
    };

    poll().finally(() => {
      runningRef.current = false;
    });

    return () => {
      cancelled = true;
    };
  }, [user, getStatus, forceApply, queryClient]);

  return null;
}
