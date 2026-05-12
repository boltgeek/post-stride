import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Copy, Check, Calendar as CalIcon, Sparkles, ArrowRight, Trophy, Flame, Loader2 } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";
import { useAppData, useInvalidateAppData } from "@/hooks/use-app-data";
import { publishPost, type Post } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/home")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "Accueil — Routine Post" },
      { name: "description", content: "Ton coach quotidien pour publier sur Facebook" },
    ],
  }),
});

const motivations = [
  "Prête à vendre aujourd'hui ?",
  "Ton business avance quand tu postes régulièrement 🔥",
  "Chaque publication te rapproche de nouveaux clients ✨",
  "Une publication par jour, des ventes toute la semaine 💪",
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function getLast7Dates() {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { posts, streak, longestStreak, loading } = useAppData();
  const invalidate = useInvalidateAppData();

  const [firstName, setFirstName] = useState<string>("");
  const [motivation] = useState(() => motivations[Math.floor(Math.random() * motivations.length)]);
  const [copied, setCopied] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [streakToast, setStreakToast] = useState(false);
  const [rank, setRank] = useState<number | null>(null);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  // Load first name
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("user_stats")
        .select("display_name")
        .maybeSingle();
      const raw = data?.display_name || user.email?.split("@")[0] || "toi";
      setFirstName(raw.split(/\s+/)[0]);
    })();
  }, [user]);

  // Load ranking
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data } = await (supabase as any).rpc("get_leaderboard_period", {
          _period: "all",
          _limit: 1000,
          _offset: 0,
        });
        if (Array.isArray(data)) {
          setTotalUsers(data.length);
          const me = data.find((r: any) => r.is_current_user);
          setRank(me?.rank ?? null);
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, [user, posts.length]);

  const today = todayISO();
  const last7 = useMemo(() => getLast7Dates(), []);

  const todayPost: Post | null = useMemo(() => {
    const todays = posts.filter((p) => p.scheduledDate === today);
    const pending = todays.find((p) => p.status === "pending");
    if (pending) return pending;
    return todays[0] || null;
  }, [posts, today]);

  const publishedToday = todayPost?.status === "published";

  const last7Status = useMemo(() => {
    return last7.map((d) => {
      const dayPosts = posts.filter((p) => p.scheduledDate === d);
      if (dayPosts.length === 0) return "none" as const;
      if (dayPosts.some((p) => p.status === "published")) return "done" as const;
      if (d < today) return "missed" as const;
      if (d === today) return "today" as const;
      return "future" as const;
    });
  }, [posts, last7, today]);

  const rankMessage = useMemo(() => {
    if (rank === null) return "Publie pour entrer dans le classement";
    if (rank <= 3) return "Tu domines le classement 🔥";
    if (rank <= 10) return "Tu es dans le top 10 !";
    return "Poste aujourd'hui pour monter dans le classement";
  }, [rank]);

  const handleCopy = async () => {
    if (!todayPost) return;
    await navigator.clipboard.writeText(todayPost.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    try {
      await (supabase as any).rpc("increment_copy_count");
    } catch {}
  };

  const handlePublish = async () => {
    if (!todayPost || publishing) return;
    setPublishing(true);
    try {
      await publishPost(todayPost.id);
      setConfetti(true);
      setStreakToast(true);
      setTimeout(() => setConfetti(false), 1800);
      setTimeout(() => setStreakToast(false), 2200);
      invalidate();
    } catch (e) {
      console.error(e);
    } finally {
      setPublishing(false);
    }
  };

  if (authLoading || loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const dayLabels = ["L", "M", "M", "J", "V", "S", "D"];
  // Map last7 actual day-of-week labels
  const labels = last7.map((d) => {
    const idx = (new Date(d).getDay() + 6) % 7;
    return dayLabels[idx];
  });

  const hasAnyContent = posts.length > 0;
  const futurePending = posts.filter((p) => p.status === "pending" && p.scheduledDate >= today);

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
        {/* SECTION 1 — Human header */}
        <header className="animate-slide-up">
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
            Salut {firstName} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{motivation}</p>
        </header>

        {/* SECTION 2 — Hero card */}
        <section className="relative animate-slide-up" style={{ animationDelay: "60ms" }}>
          {confetti && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden z-10">
              {Array.from({ length: 18 }).map((_, i) => {
                const colors = ["#E8521A", "#F59E0B", "#10B981", "#3B82F6", "#EC4899"];
                const left = Math.random() * 100;
                const delay = Math.random() * 0.4;
                const color = colors[i % colors.length];
                return (
                  <span
                    key={i}
                    className="confetti-piece"
                    style={{
                      left: `${left}%`,
                      backgroundColor: color,
                      animationDelay: `${delay}s`,
                    }}
                  />
                );
              })}
            </div>
          )}

          {!todayPost ? (
            <div className="bg-muted/60 rounded-3xl p-6 border border-border text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-card flex items-center justify-center mb-3 shadow-card">
                <CalIcon className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-base font-bold text-foreground">📅 Ton post du jour</p>
              <p className="text-sm text-muted-foreground mt-1">
                Aucun post prévu aujourd'hui
              </p>
              <Link
                to="/calendar"
                className="inline-flex items-center gap-2 mt-4 rounded-2xl bg-card border border-border px-5 py-3 text-sm font-semibold text-foreground tap-press"
              >
                Voir mon calendrier <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : publishedToday ? (
            <div className="bg-card rounded-3xl p-6 border-2 border-success/40 shadow-card relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 gradient-success" />
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-success bg-success/10 px-3 py-1.5 rounded-full">
                  <Check className="w-3.5 h-3.5" /> 🔥 Déjà publié aujourd'hui
                </span>
              </div>
              <p className="text-base font-bold text-foreground mb-2">📅 Ton post du jour</p>
              <p className="text-sm text-foreground/80 line-clamp-3 leading-relaxed">
                {todayPost.content}
              </p>
              <p className="text-xs text-muted-foreground mt-4 italic">
                Continue comme ça, ta régularité construit ton business.
              </p>
            </div>
          ) : (
            <div className="bg-card rounded-3xl p-6 border border-border shadow-card">
              <div className="flex items-center justify-between mb-3">
                <p className="text-base font-extrabold text-foreground">📅 Ton post du jour</p>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                  Facebook
                </span>
              </div>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap mb-5 max-h-48 overflow-hidden">
                {todayPost.content}
              </p>
              <div className="space-y-2">
                <button
                  onClick={handleCopy}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl gradient-primary text-primary-foreground shadow-primary py-3.5 text-base font-bold tap-press"
                >
                  {copied ? (
                    <><Check className="w-5 h-5" /> Copié !</>
                  ) : (
                    <><Copy className="w-5 h-5" /> Copier le texte 📋</>
                  )}
                </button>
                <button
                  onClick={handlePublish}
                  disabled={publishing}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-card border-2 border-success/40 text-success py-3 text-sm font-bold tap-press disabled:opacity-60"
                >
                  {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Marquer comme publié ✅
                </button>
              </div>
            </div>
          )}

          {streakToast && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 animate-streak-bounce">
              <div className="bg-foreground text-background px-4 py-2 rounded-full text-sm font-bold shadow-card-hover whitespace-nowrap">
                🔥 +1 jour de série !
              </div>
            </div>
          )}
        </section>

        {/* SECTION 3 — Streak */}
        <section className="bg-card rounded-3xl p-5 border border-border shadow-card animate-slide-up" style={{ animationDelay: "120ms" }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-base font-extrabold text-foreground flex items-center gap-2">
              🔥 Ma série
            </p>
            <Flame className={`w-5 h-5 ${streak > 0 ? "text-streak animate-streak-fire" : "text-muted-foreground"}`} />
          </div>
          <div className="flex justify-between gap-1.5 mb-4">
            {last7Status.map((s, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    s === "done"
                      ? "gradient-success text-success-foreground shadow-card"
                      : s === "missed"
                      ? "border-2 border-primary/60 text-primary bg-primary/5"
                      : s === "today"
                      ? "border-2 border-dashed border-primary text-primary animate-pulse-glow"
                      : "bg-muted text-muted-foreground/50"
                  }`}
                >
                  {s === "done" ? "✓" : ""}
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">{labels[i]}</span>
              </div>
            ))}
          </div>
          <div className="text-center">
            <p className="text-3xl font-extrabold text-foreground">
              {streak} <span className="text-base font-semibold text-muted-foreground">jour{streak > 1 ? "s" : ""} consécutif{streak > 1 ? "s" : ""}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Meilleure série : {longestStreak} jour{longestStreak > 1 ? "s" : ""}
            </p>
          </div>
        </section>

        {/* SECTION 4 — Ranking */}
        <Link
          to="/analytics"
          className="block bg-card rounded-3xl p-5 border border-border shadow-card tap-press animate-slide-up"
          style={{ animationDelay: "180ms" }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl gradient-streak flex items-center justify-center shadow-primary flex-shrink-0">
              <Trophy className="w-6 h-6 text-streak-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-muted-foreground">🏆 Mon rang</p>
              <p className="text-lg font-extrabold text-foreground">
                {rank ? `#${rank}` : "—"}{totalUsers ? <span className="text-sm font-semibold text-muted-foreground"> sur {totalUsers} vendeuses</span> : null}
              </p>
              <p className="text-xs text-primary font-semibold mt-0.5 truncate">{rankMessage}</p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          </div>
        </Link>

        {/* SECTION 5 — Quick action */}
        <section className="animate-slide-up" style={{ animationDelay: "240ms" }}>
          {!hasAnyContent ? (
            <Link
              to="/upload"
              search={{ ai: "1" }}
              className="w-full flex items-center justify-center gap-2 rounded-2xl gradient-primary text-primary-foreground shadow-primary py-4 text-base font-bold tap-press"
            >
              <Sparkles className="w-5 h-5" /> ✨ Générer mon calendrier
            </Link>
          ) : !publishedToday && todayPost ? (
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="w-full flex items-center justify-center gap-2 rounded-2xl gradient-primary text-primary-foreground shadow-primary py-4 text-base font-bold tap-press disabled:opacity-60"
            >
              Publier mon post du jour <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <Link
              to="/calendar"
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-card border border-border text-foreground py-4 text-base font-bold tap-press"
            >
              Voir mon calendrier complet <ArrowRight className="w-5 h-5" />
            </Link>
          )}
          {hasAnyContent && futurePending.length > 0 && (
            <p className="text-xs text-muted-foreground text-center mt-3">
              {futurePending.length} post{futurePending.length > 1 ? "s" : ""} prêt{futurePending.length > 1 ? "s" : ""} dans ton calendrier
            </p>
          )}
        </section>
      </div>
      <BottomNav />
    </div>
  );
}
