import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { BarChart3, Heart, MessageCircle, TrendingUp, Trophy, Flame } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";
import { useAppData } from "@/hooks/use-app-data";
import { getWeeklyStats, getLevelName, type Post } from "@/lib/store";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

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

  const publishedPosts = posts
    .filter((p: Post) => p.status === "published" && (p.reactions !== undefined || p.comments !== undefined))
    .sort((a: Post, b: Post) => a.scheduledDate.localeCompare(b.scheduledDate));

  const chartData = publishedPosts.map((p: Post) => ({
    date: new Date(p.scheduledDate + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
    engagement: (p.reactions || 0) + (p.comments || 0),
    reactions: p.reactions || 0,
    comments: p.comments || 0,
  }));

  const topPosts = [...publishedPosts]
    .sort((a: Post, b: Post) => ((b.reactions || 0) + (b.comments || 0)) - ((a.reactions || 0) + (a.comments || 0)))
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <h1 className="text-xl font-bold text-foreground mb-6">Statistiques</h1>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { label: "Total publiés", value: posts.filter((p: Post) => p.status === "published").length, icon: BarChart3, color: "text-primary" },
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

        <div className="bg-card rounded-2xl p-4 shadow-card border border-border mb-6">
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

        {chartData.length > 0 && (
          <div className="bg-card rounded-2xl p-4 shadow-card border border-border mb-6">
            <p className="text-sm font-semibold text-foreground mb-4">Engagement</p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} />
                <YAxis tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: "12px", fontSize: "12px" }} />
                <Line type="monotone" dataKey="engagement" stroke="var(--color-primary)" strokeWidth={2.5} dot={{ fill: "var(--color-primary)", r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="bg-card rounded-2xl p-4 shadow-card border border-border mb-6">
          <p className="text-sm font-semibold text-foreground mb-3">Cette semaine</p>
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
