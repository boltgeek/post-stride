import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser();
    if (userError || !userData?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    const { boutique, produits, prix, clientes, ton } = await req.json();
    if (!boutique || !produits) {
      return Response.json({ error: "Champs manquants" }, { status: 400, headers: corsHeaders });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Tu es une copywriter experte en contenu Facebook pour vendeuses africaines.
Tu génères 30 posts Facebook UNIQUES, prêts à publier, basés sur les infos de la boutique.

Règles strictes :
- 30 posts variés (ne te répète pas) : storytelling, conseils, témoignages clients, présentation produits, promos, questions engagement, behind the scenes, etc.
- Chaque post : 50 à 250 mots, ton naturel et humain
- Ajoute des emojis au début et au fil du texte
- AUCUN hashtag (#), c'est interdit
- N'invente pas de prix précis si non fournis, reste vague (ex: "à petit prix")
- Adapte le ton demandé
- Réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks
Format :
{ "posts": [ { "content": "..." }, ... 30 entries ... ] }`;

    const userPrompt = `Boutique : ${boutique}
Ce que je vends : ${produits}
Prix moyens : ${prix || "non précisé"}
Clientes cibles : ${clientes || "non précisé"}
Ton de communication : ${ton || "Amical"}

Génère 30 posts Facebook variés et engageants pour cette boutique.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI error:", response.status, t);
      if (response.status === 429) return Response.json({ error: "Trop de requêtes, réessaie dans quelques secondes" }, { status: 429, headers: corsHeaders });
      if (response.status === 402) return Response.json({ error: "Crédits IA épuisés" }, { status: 402, headers: corsHeaders });
      return Response.json({ error: "Erreur d'analyse IA" }, { status: 500, headers: corsHeaders });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return Response.json({ error: "Pas de réponse de l'IA" }, { status: 500, headers: corsHeaders });

    let parsed;
    try {
      const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return Response.json({ error: "Réponse IA invalide, réessaie" }, { status: 500, headers: corsHeaders });
    }

    if (parsed.posts && Array.isArray(parsed.posts)) {
      parsed.posts = parsed.posts.map((p: any) => ({
        content: String(p.content || "").replace(/#\w+/g, "").replace(/\s{2,}/g, " ").trim(),
      })).filter((p: any) => p.content.length > 20);
    }

    return Response.json(parsed, { headers: corsHeaders });
  } catch (e) {
    console.error("generate-posts-ai error:", e);
    return Response.json({ error: e instanceof Error ? e.message : "Erreur inconnue" }, { status: 500, headers: corsHeaders });
  }
});
