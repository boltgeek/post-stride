import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const TARAMONEY_LINKS = {
  starter: "https://www.taramoney.com/pay/04357",
  essentielle: "https://www.taramoney.com/pay/54392",
  premium: "https://www.taramoney.com/pay/65249",
  ai_full: "https://www.taramoney.com/pay/69066",
} as const;

export const PLAN_AMOUNTS_FCFA = {
  starter: 12500,
  essentielle: 25000,
  premium: 50000,
  ai_full: 2500,
} as const;

const PlanSchema = z.enum(["starter", "essentielle", "premium", "ai_full"]);

/**
 * Creates a pending purchase row and returns the Taramoney pay URL with the
 * reference appended as a query param so the webhook can match it back.
 */
export const createPurchase = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        plan: PlanSchema,
        documentId: z.string().uuid().nullish(),
      })
      .parse(input)
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const reference = crypto.randomUUID();
    const amount = PLAN_AMOUNTS_FCFA[data.plan];

    const { error } = await supabaseAdmin.from("purchases").insert({
      user_id: userId,
      plan: data.plan,
      reference,
      status: "pending",
      amount_fcfa: amount,
      document_id: data.documentId ?? null,
      provider: "taramoney",
    });
    if (error) throw new Error(error.message);

    const baseUrl = TARAMONEY_LINKS[data.plan];
    // Append reference + customer so the webhook can match it back.
    const payUrl = `${baseUrl}?reference=${encodeURIComponent(
      reference
    )}&customer=${encodeURIComponent(userId)}`;

    return { reference, payUrl, amountFcfa: amount };
  });

/** Returns the latest purchase status for the current user (used to poll after payment). */
export const getLatestPurchaseStatus = createServerFn({ method: "GET" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ reference: z.string().min(1) }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: row, error } = await supabaseAdmin
      .from("purchases")
      .select("status, plan, amount_fcfa, updated_at")
      .eq("reference", data.reference)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row ?? null;
  });

/**
 * Force / manual unlock. If the matching purchase is in 'success' status,
 * (re)applies its benefits to user_stats idempotently. Use this when the
 * webhook fired but the UI never picked it up, or after the user clicks
 * the "Mon accès n'est pas débloqué" button.
 */
export const forceApplyPurchase = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ reference: z.string().min(1) }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: purchase, error: pErr } = await supabaseAdmin
      .from("purchases")
      .select("id, user_id, plan, status")
      .eq("reference", data.reference)
      .eq("user_id", userId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!purchase) return { applied: false, status: "not_found" as const };
    if (purchase.status !== "success") {
      return { applied: false, status: purchase.status };
    }

    if (purchase.plan === "ai_full") {
      const { data: stats } = await supabaseAdmin
        .from("user_stats")
        .select("ai_full_unlocked_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (!stats?.ai_full_unlocked_at) {
        await supabaseAdmin
          .from("user_stats")
          .update({ ai_full_unlocked_at: new Date().toISOString() })
          .eq("user_id", userId);
      }
    } else {
      const { data: stats } = await supabaseAdmin
        .from("user_stats")
        .select("subscription_plan, subscription_until")
        .eq("user_id", userId)
        .maybeSingle();

      const alreadyActive =
        stats?.subscription_plan === purchase.plan &&
        stats?.subscription_until &&
        new Date(stats.subscription_until) > new Date();

      if (!alreadyActive) {
        const baseDate =
          stats?.subscription_until && new Date(stats.subscription_until) > new Date()
            ? new Date(stats.subscription_until)
            : new Date();
        const until = new Date(baseDate);
        until.setDate(until.getDate() + 30);
        await supabaseAdmin
          .from("user_stats")
          .update({
            subscription_plan: purchase.plan,
            subscription_until: until.toISOString(),
          })
          .eq("user_id", userId);
      }
    }

    return { applied: true, status: "success" as const };
  });
