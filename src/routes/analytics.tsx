import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Trophy, Crown, Medal, Award } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
  head: () => ({
    meta: [
      { title: "Classement — PostPilot" },
      { name: "description", content: "Classement des vendeuses les plus actives" },
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

function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_leaderboard");
      if (error) throw error;
      return (data ?? []) as LeaderboardRow[];
    },
    enabled: !!user,
    refetchInterval: 15000,
  });

  // Realtime: refetch on any user_stats change
  useEffect(() => {
    const channel = supabase
      .channel("leaderboard-stats")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "user_stats" }, () => refetch())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "user_stats" }, () => refetch())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  if (authLoading || isLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const rows = data ?? [];
  const top10 = rows.filter((r) => r.rank <= 10);
  const top3 = top10.slice(0, 3);
  const rest = top10.slice(3);
  const me = rows.find((r) => r.is_current_user);
  const myInTop10 = !!me && me.rank <= 10;

  // Progression text
  let progression = "";
  if (me) {
    if (me.rank === 1) progression = "🥇 Tu es n°1 du classement !";
    else {
      const ahead = top10.find((r) => r.rank === me.rank - 1);
      if (ahead) {
        const diff = ahead.publish_count - me.publish_count;
        progression = `À ${diff} publication${diff > 1 ? "s" : ""} de la place ${ahead.rank}`;
      }
    }
  }

  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);
  const heights = ["h-20", "h-28", "h-16"];
  const medals = [
    { icon: Medal, color: "text-muted-foreground", bg: "bg-muted-foreground/10" },
    { icon: Crown, color: "text-warning", bg: "bg-warning/15" },
    { icon: Award, color: "text-primary", bg: "bg-primary/10" },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="flex items-center gap-2 mb-1">
          <Trophy className="w-5 h-5 text-warning" />
          <h1 className="text-xl font-bold text-foreground">Classement</h1>
        </div>
        <p className="text-xs text-muted-foreground mb-6">
          Top 10 des vendeuses les plus actives. Chaque clic sur « Publier » = +1 point.
        </p>

        {/* Personal card */}
        {me && (
          <div className="bg-card rounded-2xl p-4 shadow-card border border-border mb-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Ta position</p>
                <p className="text-2xl font-bold text-foreground">
                  {me.rank === 1 ? "1ère" : `${me.rank}e`}
                </p>
                {progression && (
                  <p className="text-xs text-primary mt-1">{progression}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Tes publications</p>
                <p className="text-2xl font-bold text-foreground">{me.publish_count}</p>
              </div>
            </div>
          </div>
        )}

        {/* Podium */}
        {top3.length > 0 && (
          <div className="bg-card rounded-2xl p-4 shadow-card border border-border mb-5">
            <p className="text-sm font-semibold text-foreground mb-4 text-center">🏆 Top 3</p>
            <div className="flex items-end justify-center gap-3">
              {podiumOrder.map((row, i) => {
                if (!row) return null;
                const realIdx = row.rank - 1; // 0,1,2
                const M = medals[realIdx];
                return (
                  <div key={row.user_id} className="flex-1 flex flex-col items-center">
                    <div className={`w-12 h-12 rounded-full ${M.bg} flex items-center justify-center mb-2`}>
                      <M.icon className={`w-6 h-6 ${M.color}`} />
                    </div>
                    <p className="text-xs font-semibold text-foreground truncate max-w-full text-center">
                      {row.display_name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{row.publish_count} pub.</p>
                    <div className={`${heights[i]} w-full gradient-primary rounded-t-lg mt-2 flex items-start justify-center pt-1`}>
                      <span className="text-white text-sm font-bold">{row.rank}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Rest of top 10 */}
        {rest.length > 0 && (
          <div className="space-y-2 mb-4">
            {rest.map((row) => (
              <div
                key={row.user_id}
                className={`rounded-xl p-3 shadow-card border flex items-center gap-3 ${
                  row.is_current_user
                    ? "bg-primary/5 border-primary"
                    : "bg-card border-border"
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-sm font-bold text-foreground">{row.rank}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {row.display_name}
                    {row.is_current_user && <span className="text-xs text-primary ml-1">(toi)</span>}
                  </p>
                </div>
                <p className="text-sm font-bold text-foreground">{row.publish_count}</p>
              </div>
            ))}
          </div>
        )}

        {/* If user not in top 10, show separator + their row */}
        {me && !myInTop10 && (
          <>
            <p className="text-center text-muted-foreground text-xs my-3">• • •</p>
            <div className="rounded-xl p-3 shadow-card border bg-primary/5 border-primary flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <span className="text-sm font-bold text-white">{me.rank}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {me.display_name} <span className="text-xs text-primary ml-1">(toi)</span>
                </p>
              </div>
              <p className="text-sm font-bold text-foreground">{me.publish_count}</p>
            </div>
          </>
        )}

        {rows.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Pas encore de classement</p>
            <p className="text-xs mt-1">Publie ton premier post pour entrer dans le top !</p>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
