import { supabase } from "@/integrations/supabase/client";

export interface Challenge {
  id: string;
  titre: string;
  description: string | null;
  created_by: string;
  type: "officiel" | "communautaire";
  prive: boolean;
  slug: string;
  date_debut: string;
  date_fin: string;
  actif: boolean;
  message_bienvenue: string | null;
  scoring_rules: { post: number; daily_login: number; interaction: number };
  created_at: string;
  participant_count?: number;
  is_joined?: boolean;
  creator_name?: string | null;
}

export interface ChallengeParticipant {
  id: string;
  challenge_id: string;
  user_id: string | null;
  email: string | null;
  prenom: string | null;
  type_compte: "member" | "free";
  score: number;
  joined_at: string;
}

export function daysRemaining(dateFin: string): number {
  const end = new Date(dateFin);
  const now = new Date();
  const diff = Math.ceil((end.getTime() - now.getTime()) / 86400000);
  return Math.max(diff, 0);
}

export function makeSlug(titre: string): string {
  return (
    titre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) +
    "-" +
    Math.random().toString(36).slice(2, 7)
  );
}

export async function fetchChallenges(): Promise<Challenge[]> {
  const { data: challenges, error } = await supabase
    .from("challenges")
    .select("*")
    .order("actif", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;

  const ids = (challenges || []).map((c) => c.id);
  if (ids.length === 0) return [];

  const { data: parts } = await supabase
    .from("challenge_participants")
    .select("challenge_id, user_id");

  const me = (await supabase.auth.getUser()).data.user?.id;

  const counts: Record<string, number> = {};
  const joined: Record<string, boolean> = {};
  (parts || []).forEach((p: any) => {
    counts[p.challenge_id] = (counts[p.challenge_id] ?? 0) + 1;
    if (me && p.user_id === me) joined[p.challenge_id] = true;
  });

  const creatorIds = Array.from(new Set((challenges || []).map((c) => c.created_by)));
  const { data: creators } = await supabase
    .from("user_stats")
    .select("user_id, display_name")
    .in("user_id", creatorIds);
  const creatorMap: Record<string, string> = {};
  (creators || []).forEach((c: any) => (creatorMap[c.user_id] = c.display_name));

  return (challenges || []).map((c: any) => ({
    ...c,
    participant_count: counts[c.id] ?? 0,
    is_joined: joined[c.id] ?? false,
    creator_name: creatorMap[c.created_by] ?? null,
  }));
}

export async function joinChallenge(challengeId: string) {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error("Non connectée");
  const { error } = await supabase.from("challenge_participants").insert({
    challenge_id: challengeId,
    user_id: userId,
    type_compte: "member",
    score: 0,
  });
  if (error && !error.message.includes("duplicate")) throw error;
}

export async function createChallenge(input: {
  titre: string;
  description: string;
  duree: 7 | 14 | 30;
  prive: boolean;
  message_bienvenue: string;
  scoring_rules: { post: number; daily_login: number; interaction: number };
}) {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error("Non connectée");

  const { data: stats } = await supabase
    .from("user_stats")
    .select("challenges_created_this_month")
    .eq("user_id", userId)
    .maybeSingle();

  if ((stats?.challenges_created_this_month ?? 0) >= 1) {
    throw new Error(
      "Tu as déjà créé un challenge ce mois-ci. Reviens le mois prochain ou passe à l'offre Pro 🚀"
    );
  }

  const dateDebut = new Date();
  const dateFin = new Date();
  dateFin.setDate(dateFin.getDate() + input.duree);

  const slug = makeSlug(input.titre);

  const { data, error } = await supabase
    .from("challenges")
    .insert({
      titre: input.titre,
      description: input.description,
      created_by: userId,
      type: "communautaire",
      prive: input.prive,
      slug,
      date_debut: dateDebut.toISOString().slice(0, 10),
      date_fin: dateFin.toISOString().slice(0, 10),
      actif: true,
      message_bienvenue: input.message_bienvenue,
      scoring_rules: input.scoring_rules,
    })
    .select("id, slug")
    .single();
  if (error) throw error;

  await supabase
    .from("user_stats")
    .update({ challenges_created_this_month: (stats?.challenges_created_this_month ?? 0) + 1 })
    .eq("user_id", userId);

  // Auto-join creator
  await supabase.from("challenge_participants").insert({
    challenge_id: data.id,
    user_id: userId,
    type_compte: "member",
    score: 0,
  });

  return data;
}
