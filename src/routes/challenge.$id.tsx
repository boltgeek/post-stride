import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Share2, Loader2, Trophy, Settings } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { joinChallenge, daysRemaining, type Challenge } from "@/lib/challenges";
import { BottomNav } from "@/components/BottomNav";
import { ChallengeAdminPanel } from "@/components/ChallengeAdminPanel";
import { toast } from "sonner";

export const Route = createFileRoute("/challenge/$id")({
  component: ChallengePage,
  head: () => ({ meta: [{ title: "Challenge — Routine Post" }] }),
});

function ChallengePage() {
  const { id } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["challenge", id],
    queryFn: async () => {
      const { data: ch, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;

      const { data: parts } = await supabase
        .from("challenge_participants")
        .select("*")
        .eq("challenge_id", id)
        .order("score", { ascending: false })
        .order("joined_at", { ascending: true });

      const userIds = (parts || []).map((p: any) => p.user_id).filter(Boolean);
      const { data: stats } = userIds.length
        ? await supabase.from("user_stats").select("user_id, display_name").in("user_id", userIds)
        : { data: [] as any[] };
      const nameMap: Record<string, string> = {};
      (stats || []).forEach((s: any) => (nameMap[s.user_id] = s.display_name));

      return {
        challenge: ch as Challenge,
        participants: (parts || []).map((p: any, idx: number) => ({
          ...p,
          display_name: p.prenom || nameMap[p.user_id] || "Vendeuse",
          rank: idx + 1,
        })),
      };
    },
    enabled: !!user,
  });

  // Realtime subscription
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`challenge-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "challenge_participants", filter: `challenge_id=eq.${id}` },
        () => refetch()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "challenges", filter: `id=eq.${id}` },
        () => refetch()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, refetch]);

  // Rank-change notifications (client-side, in-app + browser if granted)
  const previousRankRef = useRef<number | null>(null);
  useEffect(() => {
    if (!data || !user) return;
    const me = data.participants.find((p: any) => p.user_id === user.id);
    if (!me) return;
    const prev = previousRankRef.current;
    const cur = me.rank as number;
    if (prev !== null && prev !== cur) {
      const ordinal = cur === 1 ? "1ère" : `${cur}e`;
      if (cur < prev) {
        toast.success(`🎉 Tu viens de passer ${ordinal} !`);
        notify("🎉 Tu progresses !", `Tu viens de passer ${ordinal}.`);
      } else {
        toast(`🔥 Tu t'es fait dépasser — tu es ${ordinal}`);
        notify("🔥 Tu t'es fait dépasser", `Tu es maintenant ${ordinal}.`);
      }
    }
    previousRankRef.current = cur;
  }, [data, user]);

  if (authLoading || isLoading || !user || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const { challenge, participants } = data;
  const visibleParts = participants.filter((p: any) => p.score > 0);
  const me = participants.find((p: any) => p.user_id === user.id);
  const myRank = me?.rank ?? null;
  const isJoined = !!me;
  const top3 = visibleParts.slice(0, 3);
  const isClosed = !challenge.actif || daysRemaining(challenge.date_fin) === 0;
  const winner = top3[0];
  const isOrganizer = challenge.created_by === user.id;
  const mySuspendedUntil = me?.suspendue_jusqu_au && new Date(me.suspendue_jusqu_au) > new Date()
    ? new Date(me.suspendue_jusqu_au)
    : null;

  // Points needed to climb one rank
  let pointsToNext: number | null = null;
  if (me && myRank && myRank > 1) {
    const above = participants[myRank - 2];
    pointsToNext = above ? Math.max(1, (above.score ?? 0) - (me.score ?? 0) + 1) : null;
  }

  const handleJoin = async () => {
    try {
      await joinChallenge(challenge.id);
      toast.success("🎉 Tu as rejoint le challenge ! Publie ton premier post pour gagner des points.");
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    }
  };

  const copyShareLink = async () => {
    const url = `${window.location.origin}/challenge/${challenge.id}`;
    await navigator.clipboard.writeText(url);
    toast.success("Lien copié !");
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <Link to="/analytics" className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Retour
        </Link>

        {isClosed && winner && (
          <div className="bg-warning/10 border border-warning/30 rounded-2xl p-4 mb-4">
            <p className="text-sm font-semibold text-foreground">
              🏆 Challenge terminé le {new Date(challenge.date_fin).toLocaleDateString("fr-FR")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {winner.display_name} a remporté ce challenge 🏆
            </p>
          </div>
        )}

        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-5">
          <h1 className="text-xl font-bold text-foreground mb-1">{challenge.titre}</h1>
          {challenge.description && (
            <p className="text-sm text-muted-foreground mb-3">{challenge.description}</p>
          )}
          <div className="flex items-center gap-3 text-xs text-foreground mb-3">
            <span>👥 {participants.length} participantes</span>
            <span>{isClosed ? "✅ Terminé" : `⏳ ${daysRemaining(challenge.date_fin)} j restants`}</span>
          </div>
          <div className="text-xs text-muted-foreground mb-3">
            Règles : {challenge.scoring_rules.post}pts/post · {challenge.scoring_rules.daily_login}pts/connexion · {challenge.scoring_rules.interaction}pts/interaction
          </div>
          <div className="flex gap-2">
            {!isJoined && !isClosed && (
              <button
                onClick={handleJoin}
                className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-semibold"
              >
                Rejoindre
              </button>
            )}
            <button
              onClick={copyShareLink}
              className="flex items-center gap-1 px-3 py-2 rounded-lg border border-border bg-card text-sm font-medium text-foreground"
            >
              <Share2 className="w-4 h-4" /> Lien
            </button>
          </div>
        </div>

        {me && !isClosed && (
          <div className="bg-card rounded-2xl p-4 shadow-card border-2 border-[#ec7a3c] mb-5">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs text-muted-foreground">Ta position</p>
                <p className="text-2xl font-bold text-foreground">
                  {myRank === 1 ? "1ère" : `${myRank}e`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Score</p>
                <p className="text-3xl font-bold text-foreground">{me.score}</p>
              </div>
            </div>
            {pointsToNext !== null ? (
              <p className="text-xs text-muted-foreground mb-3">
                Il te manque <span className="font-semibold text-foreground">{pointsToNext} pts</span> pour passer au rang supérieur.
              </p>
            ) : myRank === 1 ? (
              <p className="text-xs text-muted-foreground mb-3">Tu es en tête, garde le rythme 🚀</p>
            ) : null}
            <Link
              to="/"
              className="block w-full text-center py-2.5 rounded-lg text-white text-sm font-semibold"
              style={{ backgroundColor: "#ec7a3c" }}
            >
              Publier maintenant
            </Link>
          </div>
        )}

        {top3.length > 0 && (
          <div className="bg-card rounded-2xl p-4 shadow-card border border-border mb-5">
            <p className="text-sm font-semibold text-foreground mb-4 text-center">
              {isClosed ? "🏆 Classement final" : "🏆 Top 3"}
            </p>
            <Podium top3={top3} />
          </div>
        )}

        <div className="space-y-2">
          {visibleParts.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Publie ton premier post pour apparaître dans le classement 🚀</p>
            </div>
          )}
          {visibleParts.slice(3).map((p: any) => (
            <div
              key={p.id}
              className={`rounded-xl p-3 shadow-card border flex items-center gap-3 ${
                p.user_id === user.id ? "bg-primary/5 border-[#ec7a3c]" : "bg-card border-border"
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <span className="text-sm font-bold text-foreground">{p.rank}</span>
              </div>
              <p className="flex-1 text-sm font-medium text-foreground truncate">{p.display_name}</p>
              <p className="text-sm font-bold text-foreground">{p.score}</p>
            </div>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

function notify(title: string, body: string) {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/icon-512.png", badge: "/icon-512.png" });
  } catch {
    /* ignore */
  }
}

function Podium({ top3 }: { top3: any[] }) {
  const order = [top3[1], top3[0], top3[2]].filter(Boolean);
  const heights = ["h-20", "h-28", "h-16"];
  const emojis = ["👑", "🥈", "🥉"];
  return (
    <div className="flex items-end justify-center gap-3">
      {order.map((row, i) => {
        if (!row) return null;
        const realIdx = row.rank - 1;
        return (
          <div key={row.id} className="flex-1 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2 text-2xl">
              <span>{emojis[realIdx]}</span>
            </div>
            <p className="text-xs font-semibold text-foreground truncate max-w-full text-center">
              {row.display_name}
            </p>
            <p className="text-[10px] text-muted-foreground">{row.score} pts</p>
            <div className={`${heights[i]} w-full gradient-primary rounded-t-lg mt-2 flex items-start justify-center pt-1`}>
              <span className="text-white text-sm font-bold">{row.rank}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
