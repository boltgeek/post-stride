import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Require authentication — prevents unauthenticated abuse of AI credits
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser();
    if (userError || !userData?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    const { text, fileName } = await req.json();
    if (!text || text.trim().length < 20) {
      return Response.json({ error: "Document trop court ou vide" }, { status: 400, headers: corsHeaders });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Tu es un assistant expert en content marketing pour Facebook.
Tu reçois le contenu brut extrait d'un document (PDF ou Word).

Ta mission :
1. COMPRENDRE le document : quel est le sujet, le ton, le public cible
2. EXTRAIRE les posts Facebook exploitables
3. IGNORER tout ce qui n'est pas du contenu publiable (headers, footers, numéros de page, sommaires, métadonnées)
4. STRUCTURER chaque post avec un texte prêt à publier

Règles :
- Chaque post doit être un texte COMPLET et AUTONOME, prêt à copier-coller sur Facebook
- Si le document contient déjà des posts rédigés, garde-les tels quels
- Si le document contient des idées ou brouillons, transforme-les en posts complets
- Garde le ton et le style du document original
- Ajoute des emojis si le style du document s'y prête
- Chaque post doit faire entre 50 et 500 mots
- NE JAMAIS ajouter de hashtags (#). Aucun hashtag dans les posts. C'est interdit.
- NE JAMAIS inventer de contenu qui n'est pas dans le document

IMPORTANT : Réponds UNIQUEMENT avec un JSON valide, sans markdown, sans backticks.
Format :
{
  "documentSummary": "Résumé en 1 phrase du document",
  "posts": [
    { "content": "Texte du post 1" },
    { "content": "Texte du post 2" }
  ]
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Fichier : ${fileName}\n\nContenu du document :\n\n${text.slice(0, 30000)}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return Response.json({ error: "Trop de requêtes, réessaie dans quelques secondes" }, { status: 429, headers: corsHeaders });
      }
      if (response.status === 402) {
        return Response.json({ error: "Crédits IA épuisés" }, { status: 402, headers: corsHeaders });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return Response.json({ error: "Erreur d'analyse IA" }, { status: 500, headers: corsHeaders });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return Response.json({ error: "Pas de réponse de l'IA" }, { status: 500, headers: corsHeaders });
    }

    let parsed;
    try {
      const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", content);
      return Response.json({ error: "Réponse IA invalide, réessaie" }, { status: 500, headers: corsHeaders });
    }

    // Strip any hashtags that slipped through
    if (parsed.posts && Array.isArray(parsed.posts)) {
      parsed.posts = parsed.posts.map((p: any) => ({
        ...p,
        content: p.content.replace(/#\w+/g, "").replace(/\s{2,}/g, " ").trim(),
      }));
    }

    return Response.json(parsed, { headers: corsHeaders });
  } catch (e) {
    console.error("analyze-document error:", e);
    return Response.json(
      { error: e instanceof Error ? e.message : "Erreur inconnue" },
      { status: 500, headers: corsHeaders }
    );
  }
});
