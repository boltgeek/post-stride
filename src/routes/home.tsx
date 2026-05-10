import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Upload, Calendar, BarChart3, MessageCircle, ArrowRight, Sparkles, Flame } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";
import { useAppData } from "@/hooks/use-app-data";
import { getLevelName } from "@/lib/store";

export const Route = createFileRoute("/home")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "Accueil — Routine Post" },
      { name: "description", content: "Ton tableau de bord Routine Post" },
    ],
  }),
});

function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { posts, streak, level, loading } = useAppData();

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
  const firstName = user.email?.split("@")[0] || "toi";

  const steps = [
    {
      n: 1,
      icon: Upload,
      title: "Importe ton contenu",
      desc: "Dépose ton document Word ou PDF. L'IA extrait tes posts automatiquement.",
      to: "/upload",
      cta: "Importer un document",
    },
    {
      n: 2,
      icon: Calendar,
      title: "Suis ton calendrier",
      desc: "Tes posts sont planifiés jour par jour. Publie-les en 1 clic.",
      to: "/calendar",
      cta: "Voir mon calendrier",
    },
    {
      n: 3,
      icon: BarChart3,
      title: "Suis ta progression",
      desc: "Garde ta série, monte de niveau et compare-toi aux autres vendeuses.",
      to: "/analytics",
      cta: "Voir le classement",
    },
    {
      n: 4,
      icon: MessageCircle,
      title: "Pose tes questions",
      desc: "Le coach IA est là pour t'aider à rester régulière.",
      to: "/coach",
      cta: "Parler au coach",
    },
  ] as const;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-primary">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Salut {firstName} 👋</h1>
              <p className="text-xs text-muted-foreground">Bienvenue sur Routine Post</p>
            </div>
          </div>
        </header>

        {/* Quick stats if user has posts */}
        {hasPosts && (
          <div className="bg-card rounded-2xl p-4 shadow-card border border-border mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center shadow-primary">
                <Flame className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-base font-bold text-foreground">{streak} jour{streak > 1 ? "s" : ""}</p>
                <p className="text-[11px] text-muted-foreground">Niveau {level} · {getLevelName(level)}</p>
              </div>
            </div>
            <Link to="/calendar" className="text-xs font-semibold text-primary flex items-center gap-1">
              Continuer <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}

        {/* Onboarding for new users */}
        {!hasPosts && (
          <div className="bg-accent/40 border border-primary/20 rounded-2xl p-5 mb-5">
            <p className="text-sm font-bold text-foreground mb-1">🚀 Premiers pas</p>
            <p className="text-xs text-muted-foreground mb-4">
              Suis ces 4 étapes pour publier sans stress sur Facebook.
            </p>
            <Link
              to="/upload"
              className="inline-flex items-center gap-2 rounded-xl gradient-primary text-primary-foreground shadow-primary px-4 py-2.5 text-sm font-semibold"
            >
              <Upload className="w-4 h-4" /> Commencer par importer
            </Link>
          </div>
        )}

        {/* How it works */}
        <h2 className="text-sm font-semibold text-foreground mb-3">Comment ça marche</h2>
        <div className="space-y-3">
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.n}
                to={s.to}
                className="block bg-card rounded-2xl p-4 shadow-card border border-border hover:shadow-card-hover transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="relative flex-shrink-0">
                    <div className="w-11 h-11 rounded-xl bg-accent flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                      {s.n}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{s.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{s.desc}</p>
                    <p className="text-xs font-semibold text-primary mt-2 flex items-center gap-1">
                      {s.cta} <ArrowRight className="w-3 h-3" />
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Account link */}
        <Link
          to="/account"
          className="block mt-5 text-center text-xs text-muted-foreground hover:text-foreground py-3"
        >
          Mon compte & paramètres
        </Link>
      </div>
      <BottomNav />
    </div>
  );
}
