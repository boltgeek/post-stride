import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ChevronDown, ChevronUp, ArrowRight, Upload, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { StreakBadge } from "@/components/StreakBadge";
import { ProgressRing } from "@/components/ProgressRing";
import { PostCard } from "@/components/PostCard";
import { NotificationToggle } from "@/components/NotificationToggle";
import { useAuth } from "@/lib/auth";
import { useAppData, useInvalidateAppData } from "@/hooks/use-app-data";
import { useNotifications, useScheduleDailyReminders } from "@/hooks/use-notifications";
import { toast } from "sonner";
import {
  getTodayPosts,
  getNextPost,
  getWeeklyStats,
  getLevelName,
  getRewardMessage,
  rescheduleAllPending,
  type Post,
} from "@/lib/store";

export const Route = createFileRoute("/calendar")({
  component: CalendarPage,
  head: () => ({
    meta: [
      { title: "Calendrier — PostPilot" },
      { name: "description", content: "Ton calendrier éditorial : publie tes posts du jour" },
    ],
  }),
});

function CalendarPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { posts, streak, level, totalPoints, postsPerDay, loading } = useAppData();
  const invalidate = useInvalidateAppData();
  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [showUpcoming, setShowUpcoming] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const { enabled: notifEnabled } = useNotifications();
  useScheduleDailyReminders(posts, notifEnabled);

  const latePosts = posts.filter((p) => p.status === "pending" && p.scheduledDate < todayStr);

  const handleReschedule = async () => {
    if (!user) return;
    setRescheduling(true);
    try {
      const n = await rescheduleAllPending(user.id, postsPerDay || 3);
      toast.success(`📅 ${n} post${n > 1 ? "s" : ""} replanifié${n > 1 ? "s" : ""} à partir d'aujourd'hui`);
      invalidate();
      setSelectedDate(todayStr);
    } catch (e: any) {
      toast.error("Erreur : " + (e.message || "impossible de replanifier"));
    } finally {
      setRescheduling(false);
    }
  };

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

  const hasPosts = posts.length > 0;
  const todayPosts = getTodayPosts(posts);
  const nextPost = getNextPost(posts);
  const weekStats = getWeeklyStats(posts);
  const publishedToday = todayPosts.filter((p) => p.status === "published").length;
  const totalToday = todayPosts.length;
  const progressToday = totalToday > 0 ? (publishedToday / totalToday) * 100 : 0;
  const reward = getRewardMessage(streak);

  const dates = [...new Set(posts.map((p: Post) => p.scheduledDate))].sort();
  const selectedPosts = posts
    .filter((p: Post) => p.scheduledDate === selectedDate)
    .sort((a: Post, b: Post) => a.scheduledTime.localeCompare(b.scheduledTime));
  const currentIdx = dates.indexOf(selectedDate);
  const isToday = selectedDate === todayStr;

  const upcomingPosts = posts
    .filter((p) => p.scheduledDate > todayStr && p.status === "pending")
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.scheduledTime.localeCompare(b.scheduledTime));

  const upcomingByDate = upcomingPosts.reduce<Record<string, Post[]>>((acc, p) => {
    if (!acc[p.scheduledDate]) acc[p.scheduledDate] = [];
    acc[p.scheduledDate].push(p);
    return acc;
  }, {});

  const goTo = (dir: -1 | 1) => {
    const newIdx = currentIdx + dir;
    if (newIdx >= 0 && newIdx < dates.length) setSelectedDate(dates[newIdx]);
  };

  const formatDate = (d: string) => {
    if (d === todayStr) return "Aujourd'hui";
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (d === tomorrow.toISOString().slice(0, 10)) return "Demain";
    return new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <header className="mb-6">
          <h1 className="text-xl font-bold text-foreground">Calendrier</h1>
          <p className="text-xs text-muted-foreground">Ton espace pour publier chaque jour</p>
        </header>

        {!hasPosts ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-slide-up">
            <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mb-6 shadow-primary">
              <CalendarIcon className="w-10 h-10 text-primary-foreground" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-2">Aucun contenu planifié</h2>
            <p className="text-sm text-muted-foreground mb-8 max-w-xs">
              Importe d'abord tes posts pré-écrits, puis reviens ici pour les publier au quotidien.
            </p>
            <Link to="/upload">
              <Button className="rounded-xl gradient-primary text-primary-foreground shadow-primary h-14 px-8 text-base font-semibold">
                <Plus className="w-5 h-5 mr-2" /> Importer mon contenu
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Streak + progress */}
            <div className="bg-card rounded-2xl p-4 shadow-card border border-border mb-4 animate-slide-up">
              <div className="flex items-center justify-between">
                <StreakBadge streak={streak} level={level} levelName={getLevelName(level)} />
                <ProgressRing progress={progressToday} size={64} label={`${publishedToday}/${totalToday}`} sublabel="aujourd'hui" />
              </div>
            </div>

            {reward && (
              <div className="bg-card rounded-2xl p-4 shadow-card border-2 border-streak mb-4 animate-confetti-pop text-center">
                <p className="text-base font-bold text-foreground">{reward}</p>
              </div>
            )}

            <NotificationToggle />

            {/* Reschedule banner */}
            {latePosts.length > 0 ? (
              <div className="bg-accent border-2 border-primary rounded-2xl p-4 mb-4 animate-slide-up">
                <p className="text-sm font-semibold text-foreground mb-1">
                  ⚠️ {latePosts.length} post{latePosts.length > 1 ? "s" : ""} en retard
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  Repars de zéro : on replanifie tout à partir d'aujourd'hui.
                </p>
                <Button
                  onClick={handleReschedule}
                  disabled={rescheduling}
                  className="w-full rounded-xl gradient-primary text-primary-foreground shadow-primary h-11 text-sm font-semibold"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${rescheduling ? "animate-spin" : ""}`} />
                  Mettre à jour mon calendrier
                </Button>
              </div>
            ) : (
              <button
                onClick={handleReschedule}
                disabled={rescheduling || posts.filter((p) => p.status === "pending").length === 0}
                className="w-full bg-card rounded-2xl p-3 mb-4 shadow-card border border-border flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${rescheduling ? "animate-spin" : ""}`} />
                Mettre à jour mon calendrier
              </button>
            )}

            {/* Week stats */}
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

            {/* Date selector */}
            <div className="flex items-center justify-between bg-card rounded-2xl p-3 shadow-card border border-border mb-4">
              <button onClick={() => goTo(-1)} disabled={currentIdx <= 0} className="p-2 rounded-xl hover:bg-accent disabled:opacity-30 transition-all" aria-label="Jour précédent">
                <ChevronLeft className="w-5 h-5 text-foreground" />
              </button>
              <span className="text-sm font-semibold text-foreground capitalize">{formatDate(selectedDate)}</span>
              <button onClick={() => goTo(1)} disabled={currentIdx >= dates.length - 1} className="p-2 rounded-xl hover:bg-accent disabled:opacity-30 transition-all" aria-label="Jour suivant">
                <ChevronRight className="w-5 h-5 text-foreground" />
              </button>
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-3 mb-4 scrollbar-none">
              {dates.map((d) => {
                const dayPosts = posts.filter((p: Post) => p.scheduledDate === d);
                const allDone = dayPosts.every((p: Post) => p.status !== "pending");
                const isTodayBtn = d === todayStr;
                return (
                  <button
                    key={d}
                    onClick={() => setSelectedDate(d)}
                    className={`flex flex-col items-center gap-0.5 min-w-[44px] rounded-xl py-2 px-1 transition-all ${
                      d === selectedDate ? "gradient-primary text-primary-foreground" : "bg-card border border-border"
                    }`}
                  >
                    <span className="text-[9px] font-medium uppercase">
                      {new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "short" })}
                    </span>
                    <span className="text-xs font-bold">{new Date(d + "T00:00:00").getDate()}</span>
                    {allDone && dayPosts.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-success" />}
                    {isTodayBtn && d !== selectedDate && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                  </button>
                );
              })}
            </div>

            {/* Selected day posts — interactive on today, read-only on others */}
            {isToday ? (
              <>
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

                {todayPosts.filter((p) => p.id !== nextPost?.id).length > 0 && (
                  <div className="mt-4">
                    <h2 className="text-sm font-semibold text-foreground mb-3">Autres posts du jour</h2>
                    <div className="space-y-3">
                      {todayPosts.filter((p) => p.id !== nextPost?.id).map((p) => (
                        <PostCard key={p.id} post={p} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-3">
                {selectedPosts.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">Aucun post ce jour</p>
                ) : (
                  selectedPosts.map((p) => <PostCard key={p.id} post={p} />)
                )}
              </div>
            )}

            {/* Upcoming */}
            {upcomingPosts.length > 0 && (
              <div className="mt-5">
                <button
                  onClick={() => setShowUpcoming(!showUpcoming)}
                  className="w-full flex items-center justify-between bg-card rounded-2xl p-4 shadow-card border border-border hover:shadow-card-hover transition-shadow"
                >
                  <div className="flex items-center gap-3">
                    <CalendarIcon className="w-5 h-5 text-primary" />
                    <div className="text-left">
                      <p className="text-sm font-semibold text-foreground">Posts à venir</p>
                      <p className="text-[10px] text-muted-foreground">{upcomingPosts.length} post{upcomingPosts.length > 1 ? "s" : ""} planifié{upcomingPosts.length > 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  {showUpcoming ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>

                {showUpcoming && (
                  <div className="mt-3 space-y-4 animate-slide-up">
                    {Object.entries(upcomingByDate).map(([date, datePosts]) => (
                      <div key={date}>
                        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                          {formatDate(date)}
                        </p>
                        <div className="space-y-3">
                          {datePosts.map((p) => (
                            <PostCard key={p.id} post={p} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Add more content */}
            <Link to="/upload" className="block mt-5">
              <div className="bg-card rounded-2xl p-4 shadow-card border border-dashed border-border flex items-center justify-between hover:shadow-card-hover transition-shadow">
                <div className="flex items-center gap-3">
                  <Upload className="w-5 h-5 text-primary" />
                  <p className="text-sm font-semibold text-foreground">Ajouter du contenu</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </Link>
          </>
        )}
        {/* totalPoints kept available via header on home; suppress unused var warning */}
        <span className="hidden">{totalPoints}</span>
      </div>
      <BottomNav />
    </div>
  );
}
