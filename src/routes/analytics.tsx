import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { BarChart3, Heart, MessageCircle, TrendingUp, Trophy, Flame, Clock, CalendarDays, FileText } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";
import { useAppData } from "@/hooks/use-app-data";
import { getWeeklyStats, getLevelName, type Post } from "@/lib/store";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
  head: () => ({
    meta: [
      { title: "Statistiques — PostPilot" },
      { name: "description", content: "Analyse tes performances" },
    ],
  }),
});

function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { posts, streak, longestStreak, totalPoints, level, loading } = useAppData();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/login" });
    }
  }, [authLoading, user, navigate]);

  if (authLoading || loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const weekStats = getWeeklyStats(posts);
  const publishedPosts = posts.filter((p: Post) => p.status === "published");
  const pendingPosts = posts.filter((p: Post) => p.status === "pending");
  const skippedPosts = posts.filter((p: Post) => p.status === "skipped");

  const publishedWithStats = publishedPosts
    .filter((p: Post) => p.reactions !== undefined || p.comments !== undefined)
    .sort((a: Post, b: Post) => a.scheduledDate.localeCompare(b.scheduledDate));

  const chartData = publishedWithStats.map((p: Post) => ({
    date: new Date(p.scheduledDate + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
    engagement: (p.reactions || 0) + (p.comments || 0),
    reactions: p.reactions || 0,
    comments: p.comments || 0,
  }));

  const topPosts = [...publishedWithStats]
    .sort((a: Post, b: Post) => ((b.reactions || 0) + (b.comments || 0)) - ((a.reactions || 0) + (a.comments || 0)))
    .slice(0, 3);

  // Best posting time analysis
  const timeStats: Record<string, { count: number; engagement: number }> = {};
  publishedPosts.forEach((p) => {
    const hour = p.scheduledTime.split(":")[0] + "h";
    if (!timeStats[hour]) timeStats[hour] = { count: 0, engagement: 0 };
    timeStats[hour].count++;
    timeStats[hour].engagement += (p.reactions || 0) + (p.comments || 0);
  });
  const timeChartData = Object.entries(timeStats)
    .map(([time, data]) => ({
      time,
      posts: data.count,
      avgEngagement: data.count > 0 ? Math.round(data.engagement / data.count) : 0,
    }))
    .sort((a, b) => a.time.localeCompare(b.time));

  // Completion rate
  const totalProcessed = publishedPosts.length + skippedPosts.length;
  const completionRate = totalProcessed > 0 ? Math.round((publishedPosts.length / totalProcessed) * 100) : 0;

  // Average engagement
  const totalEngagement = publishedPosts.reduce((s, p) => s + (p.reactions || 0) + (p.comments || 0), 0);
  const avgEngagement = publishedPosts.length > 0 ? Math.round(totalEngagement / publishedPosts.length) : 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <h1 className="text-xl font-bold text-foreground mb-6">Statistiques</h1>

        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {[
            { label: "Total publiés", value: publishedPosts.length, icon: BarChart3, color: "text-primary" },
            { label: "Streak actuel", value: streak, icon: Flame, color: "text-streak" },
            { label: "Meilleur streak", value: longestStreak, icon: Trophy, color: "text-warning" },
            { label: "Points", value: totalPoints, icon: TrendingUp, color: "text-success" },
          ].map((card) => (
            <div key={card.label} className="bg-card rounded-2xl p-4 shadow-card border border-border">
              <card.icon className={`w-5 h-5 ${card.color} mb-2`} />
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
              <p className="text-[10px] text-muted-foreground">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Quick stats row */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className="bg-card rounded-xl p-3 shadow-card border border-border text-center">
            <p className="text-lg font-bold text-foreground">{completionRate}%</p>
            <p className="text-[10px] text-muted-foreground">Taux de publication</p>
          </div>
          <div className="bg-card rounded-xl p-3 shadow-card border border-border text-center">
            <p className="text-lg font-bold text-foreground">{avgEngagement}</p>
            <p className="text-[10px] text-muted-foreground">Engagement moy.</p>
          </div>
          <div className="bg-card rounded-xl p-3 shadow-card border border-border text-center">
            <p className="text-lg font-bold text-foreground">{pendingPosts.length}</p>
            <p className="text-[10px] text-muted-foreground">En attente</p>
          </div>
        </div>

        {/* Level */}
        <div className="bg-card rounded-2xl p-4 shadow-card border border-border mb-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Niveau {level}</p>
              <p className="text-xs text-muted-foreground">{getLevelName(level)}</p>
            </div>
            <div className="flex-1 mx-4">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full gradient-primary rounded-full transition-all duration-500" style={{ width: `${((streak % 7) / 7) * 100}%` }} />
              </div>
              <p className="text-[9px] text-muted-foreground mt-1 text-right">{7 - (streak % 7)} jours avant niv. {level + 1}</p>
            </div>
          </div>
        </div>

        {/* Engagement chart */}
        {chartData.length > 0 && (
          <div className="bg-card rounded-2xl p-4 shadow-card border border-border mb-5">
            <p className="text-sm font-semibold text-foreground mb-4">📈 Engagement par post</p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} />
                <YAxis tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: "12px", fontSize: "12px" }} />
                <Line type="monotone" dataKey="reactions" stroke="var(--color-destructive)" strokeWidth={2} dot={{ fill: "var(--color-destructive)", r: 3 }} name="Réactions" />
                <Line type="monotone" dataKey="comments" stroke="var(--color-primary)" strokeWidth={2} dot={{ fill: "var(--color-primary)", r: 3 }} name="Commentaires" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Best posting times */}
        {timeChartData.length > 1 && (
          <div className="bg-card rounded-2xl p-4 shadow-card border border-border mb-5">
            <p className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Meilleurs horaires
            </p>
            <p className="text-[10px] text-muted-foreground mb-4">Engagement moyen par créneau</p>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={timeChartData}>
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} />
                <YAxis tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: "12px", fontSize: "12px" }} />
                <Bar dataKey="avgEngagement" fill="var(--color-primary)" radius={[6, 6, 0, 0]} name="Engagement moy." />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* This week */}
        <div className="bg-card rounded-2xl p-4 shadow-card border border-border mb-5">
          <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" /> Cette semaine
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{weekStats.published}</p>
              <p className="text-[10px] text-muted-foreground">Publiés</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground flex items-center justify-center gap-1">
                <Heart className="w-3.5 h-3.5 text-destructive" /> {weekStats.totalReactions}
              </p>
              <p className="text-[10px] text-muted-foreground">Réactions</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground flex items-center justify-center gap-1">
                <MessageCircle className="w-3.5 h-3.5 text-primary" /> {weekStats.totalComments}
              </p>
              <p className="text-[10px] text-muted-foreground">Commentaires</p>
            </div>
          </div>
        </div>

        {/* Top posts */}
        {topPosts.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-warning" /> Meilleurs posts
            </p>
            <div className="space-y-2">
              {topPosts.map((post: Post, i: number) => (
                <div key={post.id} className="bg-card rounded-xl p-3 shadow-card border border-border">
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground line-clamp-2">{post.content}</p>
                      <div className="flex gap-3 mt-1.5 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" /> {post.reactions || 0}</span>
                        <span className="flex items-center gap-0.5"><MessageCircle className="w-3 h-3" /> {post.comments || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {publishedPosts.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Pas encore de données</p>
            <p className="text-xs mt-1">Publie tes premiers posts pour voir tes stats</p>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
