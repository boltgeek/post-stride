import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Flame, Plus, ArrowRight, TrendingUp, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { StreakBadge } from "@/components/StreakBadge";
import { ProgressRing } from "@/components/ProgressRing";
import { PostCard } from "@/components/PostCard";
import {
  useStore,
  initStore,
  getTodayPosts,
  getNextPost,
  getWeeklyStats,
  getLevelName,
  getRewardMessage,
} from "@/lib/store";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "PostPilot — Ton assistant contenu" },
      { name: "description", content: "Poste chaque jour sans réfléchir. Ton CM automatique." },
    ],
  }),
});

function Dashboard() {
  const state = useStore();

  useEffect(() => {
    initStore();
  }, []);

  const todayPosts = getTodayPosts(state.posts);
  const nextPost = getNextPost(state.posts);
  const weekStats = getWeeklyStats(state.posts);
  const publishedToday = todayPosts.filter((p) => p.status === "published").length;
  const totalToday = todayPosts.length;
  const progressToday = totalToday > 0 ? (publishedToday / totalToday) * 100 : 0;
  const reward = getRewardMessage(state.streak);

  const hasPosts = state.posts.length > 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground">PostPilot</h1>
            <p className="text-xs text-muted-foreground">Ton assistant contenu</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-accent rounded-full px-3 py-1.5">
              <Flame className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-foreground">{state.totalPoints}</span>
            </div>
          </div>
        </div>

        {!hasPosts ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-slide-up">
            <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mb-6 shadow-primary">
              <Target className="w-10 h-10 text-primary-foreground" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-2">
              Prête à poster ?
            </h2>
            <p className="text-sm text-muted-foreground mb-8 max-w-xs">
              Importe ton contenu et PostPilot te dit quoi poster, quand poster.
              Tu exécutes, c'est tout.
            </p>
            <Link to="/upload">
              <Button className="rounded-xl gradient-primary text-primary-foreground shadow-primary h-14 px-8 text-base font-semibold">
                <Plus className="w-5 h-5 mr-2" /> Importer mon contenu
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Streak + Progress */}
            <div className="bg-card rounded-2xl p-4 shadow-card border border-border mb-4 animate-slide-up">
              <div className="flex items-center justify-between">
                <StreakBadge
                  streak={state.streak}
                  level={state.level}
                  levelName={getLevelName(state.level)}
                />
                <ProgressRing
                  progress={progressToday}
                  size={64}
                  label={`${publishedToday}/${totalToday}`}
                  sublabel="aujourd'hui"
                />
              </div>
            </div>

            {/* Reward */}
            {reward && (
              <div className="bg-card rounded-2xl p-4 shadow-card border-2 border-streak mb-4 animate-confetti-pop text-center">
                <p className="text-base font-bold text-foreground">{reward}</p>
              </div>
            )}

            {/* Weekly Stats Bar */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              {[
                { label: "Publiés", value: weekStats.published, icon: "✅" },
                { label: "Réactions", value: weekStats.totalReactions, icon: "❤️" },
                { label: "Jours actifs", value: `${weekStats.activeDays}/7`, icon: "📅" },
              ].map((s) => (
                <div key={s.label} className="bg-card rounded-xl p-3 shadow-card border border-border text-center">
                  <p className="text-lg">{s.icon}</p>
                  <p className="text-base font-bold text-foreground">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Next Post */}
            {nextPost ? (
              <div className="mb-3">
                <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-primary" /> Prochain post
                </h2>
                <PostCard post={nextPost} isNext />
              </div>
            ) : totalToday > 0 ? (
              <div className="bg-card rounded-2xl p-6 shadow-card border border-border text-center mb-4 animate-slide-up">
                <span className="text-3xl mb-2 block">🎉</span>
                <p className="text-sm font-semibold text-foreground">Tout est fait pour aujourd'hui !</p>
                <p className="text-xs text-muted-foreground mt-1">Reviens demain</p>
              </div>
            ) : null}

            {/* Other Today Posts */}
            {todayPosts.filter((p) => p.id !== nextPost?.id).length > 0 && (
              <div className="mt-4">
                <h2 className="text-sm font-semibold text-foreground mb-3">
                  Autres posts du jour
                </h2>
                <div className="space-y-3">
                  {todayPosts
                    .filter((p) => p.id !== nextPost?.id)
                    .map((p) => (
                      <PostCard key={p.id} post={p} />
                    ))}
                </div>
              </div>
            )}

            {/* Quick link to stats */}
            <Link to="/analytics" className="block mt-5 mb-4">
              <div className="bg-card rounded-2xl p-4 shadow-card border border-border flex items-center justify-between hover:shadow-card-hover transition-shadow">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Voir les statistiques</p>
                    <p className="text-[10px] text-muted-foreground">Découvre ce qui marche</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </Link>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
