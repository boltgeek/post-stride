import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { Trophy, Flame, FileText, Award, Loader2, ArrowRight, Activity, Package, UserRound, CheckCircle2 } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";
import { useAppData } from "@/hooks/use-app-data";
import { useSuivi } from "@/hooks/use-suivi";
import { todayISO, daysBetween } from "@/lib/suivi-store";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/home")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "Accueil — Routine Post" },
      { name: "description", content: "Ton tableau de bord personnel" },
    ],
  }),
});

interface LeaderboardRow {
  user_id: string;
  display_name: string;
  total_score: number;
  rank: number;
  is_current_user: boolean;
}

interface ActivityItem {
  id: string;
  type: "post" | "challenge_joined" | "challenge_won";
  label: string;
  detail?: string;
  date: string;
}

function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { posts, streak, totalPoints, loading } = useAppData();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  const { data: displayNameData } = useQuery({
    queryKey: ["display-name", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_stats")
        .select("display_name")
        .maybeSingle();
      if (error) throw error;
      return data?.display_name ?? null;
    },
    enabled: !!user,
  });

  const rawName = displayNameData || user?.email?.split("@")[0] || "toi";
  const firstName = rawName.split(/\s+/)[0];

  // Leaderboard (top 10) with realtime + interval refresh
  const { data: leaderboard = [] } = useQuery({
    queryKey: ["home-leaderboard"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_leaderboard_period", {
        _period: "all",
        _limit: 10,
        _offset: 0,
      });
      if (error) throw error;
      return (data ?? []) as LeaderboardRow[];
    },
    enabled: !!user,
    refetchInterval: 15000,
  });

  // My rank (separate query, larger window to find me if outside top 10)
  const { data: myRank } = useQuery({
    queryKey: ["home-my-rank"],
    queryFn: async () => {
      const { data } = await (supabase as any).rpc("get_leaderboard_period", {
        _period: "all",
        _limit: 1000,
        _offset: 0,
      });
      if (!Array.isArray(data)) return null;
      const me = data.find((r: any) => r.is_current_user);
      return me?.rank ?? null;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Recent activity
  const { data: activity = [] } = useQuery({
    queryKey: ["home-activity", user?.id],
    queryFn: async (): Promise<ActivityItem[]> => {
      if (!user) return [];
      const items: ActivityItem[] = [];

      const { data: pubPosts } = await supabase
        .from("posts")
        .select("id, content, published_at")
        .eq("user_id", user.id)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(5);
      (pubPosts ?? []).forEach((p: any) => {
        items.push({
          id: `post-${p.id}`,
          type: "post",
          label: "Post publié",
          detail: (p.content || "").slice(0, 60),
          date: p.published_at,
        });
      });

      const { data: parts } = await supabase
        .from("challenge_participants")
        .select("id, joined_at, challenge_id")
        .eq("user_id", user.id)
        .order("joined_at", { ascending: false })
        .limit(5);
      if (parts && parts.length > 0) {
        const ids = parts.map((p: any) => p.challenge_id);
        const { data: chs } = await supabase
          .from("challenges")
          .select("id, titre")
          .in("id", ids);
        const byId = new Map((chs ?? []).map((c: any) => [c.id, c.titre]));
        parts.forEach((p: any) => {
          items.push({
            id: `join-${p.id}`,
            type: "challenge_joined",
            label: "Challenge rejoint",
            detail: byId.get(p.challenge_id) || "",
            date: p.joined_at,
          });
        });
      }

      const { data: badges } = await supabase
        .from("user_badges")
        .select("id, badge_type, awarded_at, challenge_id")
        .eq("user_id", user.id)
        .order("awarded_at", { ascending: false })
        .limit(5);
      if (badges && badges.length > 0) {
        const ids = badges.map((b: any) => b.challenge_id);
        const { data: chs } = await supabase
          .from("challenges")
          .select("id, titre")
          .in("id", ids);
        const byId = new Map((chs ?? []).map((c: any) => [c.id, c.titre]));
        badges.forEach((b: any) => {
          items.push({
            id: `badge-${b.id}`,
            type: "challenge_won",
            label: `Badge ${b.badge_type}`,
            detail: byId.get(b.challenge_id) || "",
            date: b.awarded_at,
          });
        });
      }

      return items
        .filter((i) => i.date)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Realtime subscriptions
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("home-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_stats" }, () => {
        queryClient.invalidateQueries({ queryKey: ["home-leaderboard"] });
        queryClient.invalidateQueries({ queryKey: ["home-my-rank"] });
        queryClient.invalidateQueries({ queryKey: ["user-stats"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "posts", filter: `user_id=eq.${user.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["home-activity"] });
        queryClient.invalidateQueries({ queryKey: ["posts"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "challenge_participants", filter: `user_id=eq.${user.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["home-activity"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "user_badges", filter: `user_id=eq.${user.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["home-activity"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  if (authLoading || loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const publishedCount = posts.filter((p) => p.status === "published").length;

  const stats = [
    { icon: FileText, label: "Posts publiés", value: publishedCount, color: "text-primary", bg: "bg-primary/10" },
    { icon: Flame, label: "Série", value: `${streak}j`, color: "text-streak", bg: "bg-streak/10" },
    { icon: Award, label: "Points", value: totalPoints, color: "text-success", bg: "bg-success/10" },
    { icon: Trophy, label: "Rang", value: myRank ? `#${myRank}` : "—", color: "text-warning", bg: "bg-warning/10" },
  ];

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
        {/* À traiter */}
        <AToHandleBlock />

        {/* Personal stats */}
        <section className="grid grid-cols-2 gap-3 animate-slide-up">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-card rounded-2xl p-4 border border-border shadow-card">
                <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-2`}>
                  <Icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <p className="text-2xl font-extrabold text-foreground leading-none">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            );
          })}
        </section>



        {/* Recent activity */}
        <section className="bg-card rounded-3xl p-5 border border-border shadow-card animate-slide-up">
          <p className="text-base font-extrabold text-foreground flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-primary" /> Activité récente
          </p>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Aucune activité récente
            </p>
          ) : (
            <ul className="space-y-3">
              {activity.map((item) => {
                const Icon =
                  item.type === "post" ? FileText :
                  item.type === "challenge_won" ? Trophy : Flame;
                const color =
                  item.type === "post" ? "text-primary bg-primary/10" :
                  item.type === "challenge_won" ? "text-warning bg-warning/10" :
                  "text-streak bg-streak/10";
                return (
                  <li key={item.id} className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{item.label}</p>
                      {item.detail && (
                        <p className="text-xs text-muted-foreground truncate">{item.detail}</p>
                      )}
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {new Date(item.date).toLocaleDateString("fr-FR", {
                          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <Link
          to="/calendar"
          className="flex items-center justify-center gap-2 rounded-2xl bg-card border border-border text-foreground py-4 text-base font-bold tap-press"
        >
          Voir mon calendrier <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
      <BottomNav />
    </div>
  );
}
