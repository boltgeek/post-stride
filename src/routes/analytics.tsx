import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Trophy, Crown, Plus, Loader2, Flame, Users, Clock } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { fetchChallenges, joinChallenge, daysRemaining, type Challenge } from "@/lib/challenges";
import { toast } from "sonner";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
  head: () => ({
    meta: [
      { title: "Challenges — Routine Post" },
      { name: "description", content: "Challenges entre vendeuses" },
    ],
  }),
});

function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Flame className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Challenges</h1>
        </div>
        <ChallengesView />
      </div>
      <BottomNav />
    </div>
  );
}

function ChallengesView() {
  const { data: challenges, isLoading, refetch } = useQuery({
    queryKey: ["challenges"],
    queryFn: fetchChallenges,
    refetchInterval: 15000,
  });

  useEffect(() => {
    const ch = supabase
      .channel("challenges-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "challenges" }, () => refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "challenge_participants" }, () => refetch())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const list = challenges ?? [];
  const officiel = list.find((c) => c.type === "officiel" && c.actif);
  const community = list
    .filter((c) => c.type === "communautaire" && c.actif)
    .sort((a, b) => (b.participant_count ?? 0) - (a.participant_count ?? 0));
  const archived = list.filter((c) => !c.actif);

  return (
    <div className="relative pb-20">
      {officiel && <OfficialBlock challenge={officiel} onChange={refetch} />}

      <div className="flex items-center gap-2 mb-3 mt-2">
        <Flame className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-bold text-foreground">Challenges communautaires</h2>
      </div>

      {community.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <Flame className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucun challenge pour l'instant.</p>
          <p className="text-xs mt-1">Sois la première à en lancer un !</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {community.map((c) => (
            <CommunityCard key={c.id} challenge={c} onChange={refetch} />
          ))}
        </div>
      )}

      {archived.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-3 mt-6">
            <Trophy className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-bold text-muted-foreground">Terminés</h2>
          </div>
          <div className="grid gap-3 opacity-80">
            {archived.map((c) => (
              <Link
                key={c.id}
                to="/challenge/$id"
                params={{ id: c.id }}
                className="bg-card border border-border rounded-xl p-3 flex items-center justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{c.titre}</p>
                  <p className="text-[11px] text-muted-foreground">Terminé · {c.participant_count ?? 0} participantes</p>
                </div>
                <span className="text-lg">🏆</span>
              </Link>
            ))}
          </div>
        </>
      )}

      <Link
        to="/challenge/create"
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full text-white shadow-lg flex items-center justify-center"
        style={{ backgroundColor: "#ec7a3c" }}
        aria-label="Créer un challenge"
      >
        <Plus className="w-6 h-6" />
      </Link>
    </div>
  );
}

function OfficialBlock({ challenge, onChange }: { challenge: Challenge; onChange: () => void }) {
  const navigate = useNavigate();
  const handleJoin = async () => {
    try {
      await joinChallenge(challenge.id);
      toast.success("Tu participes !");
      onChange();
    } catch (e: any) {
      toast.error(e.message);
    }
  };
  return (
    <div className="bg-primary/10 border border-primary/30 rounded-2xl p-4 mb-5">
      <div className="flex items-center gap-1.5 mb-1">
        <Crown className="w-4 h-4 text-warning" />
        <span className="text-[10px] font-bold uppercase text-primary">Challenge officiel</span>
      </div>
      <h3 className="text-base font-bold text-foreground mb-1">{challenge.titre}</h3>
      {challenge.description && (
        <p className="text-xs text-muted-foreground mb-3">{challenge.description}</p>
      )}
      <div className="flex items-center gap-3 text-xs text-foreground mb-3">
        <span className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5" /> {challenge.participant_count}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" /> {daysRemaining(challenge.date_fin)} j
        </span>
      </div>
      {challenge.is_joined ? (
        <button
          onClick={() => navigate({ to: "/challenge/$id", params: { id: challenge.id } })}
          className="w-full py-2 rounded-lg bg-card border border-primary text-primary text-sm font-semibold"
        >
          Voir mon classement
        </button>
      ) : (
        <button
          onClick={handleJoin}
          className="w-full py-2 rounded-lg bg-primary text-white text-sm font-semibold"
        >
          Rejoindre
        </button>
      )}
    </div>
  );
}

function CommunityCard({ challenge, onChange }: { challenge: Challenge; onChange: () => void }) {
  const navigate = useNavigate();
  const handleJoin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await joinChallenge(challenge.id);
      toast.success("Tu participes !");
      onChange();
    } catch (err: any) {
      toast.error(err.message);
    }
  };
  return (
    <div
      onClick={() => navigate({ to: "/challenge/$id", params: { id: challenge.id } })}
      className="bg-card border border-border rounded-xl p-3 shadow-card cursor-pointer"
    >
      <h4 className="text-sm font-semibold text-foreground mb-1">{challenge.titre}</h4>
      <p className="text-[11px] text-muted-foreground mb-2">
        Par {challenge.creator_name || "Vendeuse"}
      </p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" /> {challenge.participant_count}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> {daysRemaining(challenge.date_fin)}j
          </span>
        </div>
        {challenge.is_joined ? (
          <span className="text-xs font-medium text-primary">Inscrite ✓</span>
        ) : (
          <button
            onClick={handleJoin}
            className="px-3 py-1 rounded-md bg-primary text-white text-xs font-semibold"
          >
            Rejoindre
          </button>
        )}
      </div>
    </div>
  );
}
