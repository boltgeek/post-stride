import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
      { title: "Classement & Challenges — Routine Post" },
      { name: "description", content: "Classement et challenges entre vendeuses" },
    ],
  }),
});

interface LeaderboardRow {
  user_id: string;
  display_name: string;
  copy_count: number;
  publish_count: number;
  total_score: number;
  rank: number;
  is_current_user: boolean;
}

type Period = "week" | "month" | "all";
type Tab = "leaderboard" | "challenges";

function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("leaderboard");
  const [period, setPeriod] = useState<Period>("all");
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard", period, pageSize],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_leaderboard_period", {
        _period: period,
        _limit: pageSize,
        _offset: 0,
      });
      if (error) throw error;
      return (data ?? []) as LeaderboardRow[];
    },
    enabled: !!user && tab === "leaderboard",
    refetchInterval: 15000,
  });

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
        {/* Main tabs */}
        <div className="flex gap-2 mb-5 bg-muted p-1 rounded-xl">
          <button
            onClick={() => setTab("leaderboard")}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 ${
              tab === "leaderboard" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
            }`}
          >
            🏆 Classement
          </button>
          <button
            onClick={() => setTab("challenges")}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 ${
              tab === "challenges" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
            }`}
          >
            🔥 Challenges
          </button>
        </div>

        {tab === "leaderboard" ? (
          <LeaderboardView
            rows={data ?? []}
            isLoading={isLoading}
            period={period}
            setPeriod={setPeriod}
            pageSize={pageSize}
            setPageSize={setPageSize}
          />
        ) : (
          <ChallengesView />
        )}
      </div>
      <BottomNav />
    </div>
  );
}

function LeaderboardView({
  rows,
  isLoading,
  period,
  setPeriod,
  pageSize,
  setPageSize,
}: {
  rows: LeaderboardRow[];
  isLoading: boolean;
  period: Period;
  setPeriod: (p: Period) => void;
  pageSize: number;
  setPageSize: (n: number) => void;
}) {
  const visible = rows.filter((r) => r.total_score > 0);
  const top3 = visible.filter((r) => r.rank <= 3);
  const rest = visible.filter((r) => r.rank > 3 && r.rank <= pageSize);
  const me = rows.find((r) => r.is_current_user);
  const myInPage = !!me && me.rank <= pageSize && me.total_score > 0;

  let progression = "";
  if (me && me.total_score > 0) {
    if (me.rank === 1) progression = "🥇 Tu es n°1 du classement !";
    else {
      const ahead = visible.find((r) => r.rank === me.rank - 1);
      if (ahead) {
        const diff = ahead.total_score - me.total_score;
        progression = `À ${diff} point${diff > 1 ? "s" : ""} de la place ${ahead.rank}`;
      }
    }
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-1">
        <Trophy className="w-5 h-5 text-warning" />
        <h1 className="text-xl font-bold text-foreground">Classement</h1>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Top des vendeuses les plus actives.
      </p>

      {/* Period filter */}
      <div className="flex gap-1 mb-4 bg-muted p-1 rounded-lg">
        {[
          { v: "week", l: "Cette semaine" },
          { v: "month", l: "Ce mois-ci" },
          { v: "all", l: "Depuis le début" },
        ].map((opt) => (
          <button
            key={opt.v}
            onClick={() => setPeriod(opt.v as Period)}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium ${
              period === opt.v ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
            }`}
          >
            {opt.l}
          </button>
        ))}
      </div>

      {/* Personal card */}
      {me && me.total_score > 0 && (
        <div className="bg-card rounded-2xl p-4 shadow-card border border-border mb-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-muted-foreground">Ta position</p>
              <p className="text-2xl font-bold text-foreground">
                {me.rank === 1 ? "1ère" : `${me.rank}e`}
              </p>
              {progression && <p className="text-xs text-primary mt-1">{progression}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Score</p>
              <p className="text-3xl font-bold text-foreground">{me.total_score}</p>
            </div>
          </div>
          <Link
            to="/calendar"
            className="block w-full text-center py-2.5 rounded-lg bg-primary text-white text-sm font-semibold mt-2"
            style={{ backgroundColor: "#ec7a3c" }}
          >
            Publier maintenant
          </Link>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Podium */}
          {top3.length > 0 && (
            <div className="bg-card rounded-2xl p-4 shadow-card border border-border mb-5">
              <p className="text-sm font-semibold text-foreground mb-4 text-center">🏆 Top 3</p>
              <Podium top3={top3} />
            </div>
          )}

          {/* Rest */}
          {rest.length > 0 && (
            <div className="space-y-2 mb-4">
              {rest.map((row) => (
                <div
                  key={row.user_id}
                  className={`rounded-xl p-3 shadow-card border flex items-center gap-3 ${
                    row.is_current_user ? "bg-primary/5 border-primary" : "bg-card border-border"
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-sm font-bold text-foreground">{row.rank}</span>
                  </div>
                  <p className="flex-1 text-sm font-medium text-foreground truncate">
                    {row.display_name}
                    {row.is_current_user && <span className="text-xs text-primary ml-1">(toi)</span>}
                  </p>
                  <p className="text-sm font-bold text-foreground">{row.total_score}</p>
                </div>
              ))}
            </div>
          )}

          {/* Load more */}
          {visible.length >= pageSize && (
            <button
              onClick={() => setPageSize(pageSize + 10)}
              className="w-full py-2.5 rounded-xl border border-border bg-card text-sm font-semibold text-foreground mb-4"
            >
              Voir plus
            </button>
          )}

          {/* Me out of page */}
          {me && me.total_score > 0 && !myInPage && (
            <>
              <p className="text-center text-muted-foreground text-xs my-3">• • •</p>
              <div className="rounded-xl p-3 shadow-card border bg-primary/5 border-primary flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-sm font-bold text-white">{me.rank}</span>
                </div>
                <p className="flex-1 text-sm font-medium text-foreground truncate">
                  {me.display_name} <span className="text-xs text-primary ml-1">(toi)</span>
                </p>
                <p className="text-sm font-bold text-foreground">{me.total_score}</p>
              </div>
            </>
          )}

          {visible.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Publie ton premier post pour apparaître dans le classement 🚀</p>
            </div>
          )}
        </>
      )}
    </>
  );
}

function Podium({ top3 }: { top3: LeaderboardRow[] }) {
  const order = [top3[1], top3[0], top3[2]].filter(Boolean);
  const heights = ["h-20", "h-28", "h-16"];
  const emojis = ["👑", "🥈", "🥉"];
  return (
    <div className="flex items-end justify-center gap-3">
      {order.map((row, i) => {
        if (!row) return null;
        const realIdx = row.rank - 1;
        return (
          <div key={row.user_id} className="flex-1 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-2 text-2xl">
              <span>{emojis[realIdx]}</span>
            </div>
            <p className="text-xs font-semibold text-foreground truncate max-w-full text-center">
              {row.display_name}
            </p>
            <p className="text-[10px] text-muted-foreground">{row.total_score} pts</p>
            <div className={`${heights[i]} w-full gradient-primary rounded-t-lg mt-2 flex items-start justify-center pt-1`}>
              <span className="text-white text-sm font-bold">{row.rank}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ChallengesView() {
  const { data: challenges, isLoading, refetch } = useQuery({
    queryKey: ["challenges"],
    queryFn: fetchChallenges,
    refetchInterval: 15000,
  });

  // Realtime updates
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
