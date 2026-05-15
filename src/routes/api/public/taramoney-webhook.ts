import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Taramoney payment webhook.
 *
 * Auth: Taramoney sends our API key. We accept it from any of:
 *   - header `x-api-key`
 *   - header `authorization: Bearer <key>`
 *   - JSON body field `api_key`
 *
 * Expected payload (best-effort shape — we tolerate variations):
 *   {
 *     "status": "SUCCESS" | "FAILURE",
 *     "reference": "<our purchase reference>",   // also accepted: external_reference, custom, metadata.reference
 *     "amount": 12500,
 *     ...
 *   }
 */
export const Route = createFileRoute("/api/public/taramoney-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.TARAMONEY_API_KEY;
        if (!expected) {
          return json({ ok: false, error: "Webhook not configured" }, 500);
        }

        const rawBody = await request.text();
        let payload: any = {};
        try {
          payload = rawBody ? JSON.parse(rawBody) : {};
        } catch {
          // tolerate form-encoded
          const params = new URLSearchParams(rawBody);
          payload = Object.fromEntries(params.entries());
        }

        // Verify API key
        const headerKey =
          request.headers.get("x-api-key") ||
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
          payload?.api_key ||
          payload?.apiKey;

        if (headerKey !== expected) {
          return json({ ok: false, error: "Invalid API key" }, 401);
        }

        // Resolve reference + status from various possible field names
        const reference: string | undefined =
          payload.reference ||
          payload.external_reference ||
          payload.custom ||
          payload.client_reference ||
          payload?.metadata?.reference;

        const rawStatus: string = String(
          payload.status || payload.state || ""
        ).toUpperCase();

        if (!reference) {
          return json({ ok: false, error: "Missing reference" }, 400);
        }

        const { data: purchase, error: fetchErr } = await supabaseAdmin
          .from("purchases")
          .select("id, user_id, plan, status, document_id")
          .eq("reference", reference)
          .maybeSingle();

        if (fetchErr) return json({ ok: false, error: fetchErr.message }, 500);
        if (!purchase) return json({ ok: false, error: "Purchase not found" }, 404);

        // Idempotency: ignore if already finalised.
        if (purchase.status === "success" || purchase.status === "failure") {
          return json({ ok: true, idempotent: true });
        }

        const newStatus =
          rawStatus === "SUCCESS"
            ? "success"
            : rawStatus === "FAILURE" || rawStatus === "FAILED"
              ? "failure"
              : "pending";

        const { error: updErr } = await supabaseAdmin
          .from("purchases")
          .update({
            status: newStatus,
            provider_payload: payload,
          })
          .eq("id", purchase.id);
        if (updErr) return json({ ok: false, error: updErr.message }, 500);

        if (newStatus === "success") {
          if (purchase.plan === "ai_full") {
            await supabaseAdmin
              .from("user_stats")
              .update({ ai_full_unlocked_at: new Date().toISOString() })
              .eq("user_id", purchase.user_id);
          } else {
            // Subscription: extend by ~30 days from now (or extend existing)
            const { data: stats } = await supabaseAdmin
              .from("user_stats")
              .select("subscription_until")
              .eq("user_id", purchase.user_id)
              .maybeSingle();

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
              .eq("user_id", purchase.user_id);
          }
        }

        return json({ ok: true, status: newStatus });
      },

      GET: async () =>
        json({ ok: true, message: "Taramoney webhook endpoint" }),
    },
  },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
