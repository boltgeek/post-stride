import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

export const humanizePost = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        content: z.string().min(1).max(5000),
        detail: z.string().min(1).max(500),
      })
      .parse(input)
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const system = `Tu es une copywriter Facebook pour vendeuses africaines. Tu réécris un post existant en intégrant naturellement un détail personnel fourni par l'utilisatrice (anecdote, client·e satisfait·e, produit phare...). Garde le même message principal, le même format (longueur similaire, emojis), AUCUN hashtag. Réponds UNIQUEMENT avec le texte du post réécrit, sans préambule ni guillemets.`;

    const user = `Post original :\n"""${data.content}"""\n\nDétail à intégrer : ${data.detail}\n\nRéécris le post.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`AI gateway error ${res.status}: ${text.slice(0, 200)}`);
    }
    const json = (await res.json()) as any;
    const out = json?.choices?.[0]?.message?.content?.trim();
    if (!out) throw new Error("Réponse IA vide");
    return { content: out as string };
  });
