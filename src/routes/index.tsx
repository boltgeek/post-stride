import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Upload, Calendar, CheckCircle2, BarChart3, Sparkles, ArrowRight, LogOut, Flame, MessageCircle, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";
import { useAppData } from "@/hooks/use-app-data";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Routine Post — Ton assistant contenu" },
      { name: "description", content: "Poste chaque jour sans réfléchir. Ton CM automatique." },
    ],
  }),
});

const steps = [
  {
    icon: Upload,
    title: "Importe ton contenu",
    desc: "Ajoute tes posts pré-écrits (texte, Word, PDF). Routine Post les organise pour toi.",
  },
  {
    icon: Calendar,
    title: "Suis ton calendrier",
    desc: "Chaque jour, retrouve tes posts à publier dans la page Calendrier.",
  },
  {
    icon: CheckCircle2,
    title: "Copie et publie",
    desc: "Un clic pour copier ton post, colle-le sur Facebook, marque comme publié.",
  },
  {
    icon: BarChart3,
    title: "Suis tes stats",
    desc: "Note les réactions et commentaires pour voir ce qui marche le mieux.",
  },
];

function Home() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { posts, totalPoints, loading } = useAppData();

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

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-bold text-foreground">Routine Post</h1>
            <p className="text-xs text-muted-foreground">Ton assistant contenu</p>
          </div>
          <div className="flex items-center gap-2">
            {hasPosts && (
              <div className="flex items-center gap-1 bg-accent rounded-full px-3 py-1.5">
                <Flame className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-foreground">{totalPoints}</span>
              </div>
            )}
            <Link to="/account" className="p-2 rounded-xl hover:bg-accent transition-colors" aria-label="Mon compte">
              <Settings className="w-4 h-4 text-muted-foreground" />
            </Link>
            <button onClick={signOut} className="p-2 rounded-xl hover:bg-accent transition-colors" aria-label="Se déconnecter">
              <LogOut className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Hero */}
        <section className="text-center mb-8 animate-slide-up">
          <div className="inline-flex w-16 h-16 rounded-2xl gradient-primary items-center justify-center mb-4 shadow-primary">
            <Sparkles className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2 leading-tight">
            Poste chaque jour, sans réfléchir
          </h2>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Routine Post t'aide à publier ton contenu Facebook au bon moment, garder ta régularité et faire grandir tes ventes.
          </p>
        </section>

        {/* Main CTA */}
        <Link to={hasPosts ? "/calendar" : "/upload"} className="block mb-8">
          <Button className="w-full rounded-xl gradient-primary text-primary-foreground shadow-primary h-14 text-base font-semibold">
            {hasPosts ? (
              <>
                <Calendar className="w-5 h-5 mr-2" />
                Aller à mon calendrier
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 mr-2" />
                Commencer — Importer mon contenu
              </>
            )}
          </Button>
        </Link>

        {/* How it works */}
        <section className="mb-6">
          <h3 className="text-sm font-bold text-foreground mb-1 uppercase tracking-wide">
            Comment ça marche
          </h3>
          <p className="text-xs text-muted-foreground mb-4">4 étapes simples pour démarrer</p>

          <div className="space-y-3">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className="bg-card rounded-2xl p-4 shadow-card border border-border flex gap-3 items-start animate-slide-up"
                >
                  <div className="flex-shrink-0 relative">
                    <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow-primary">
                      {i + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground mb-0.5">{step.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Quick links */}
        <section className="mt-6">
          <h3 className="text-sm font-bold text-foreground mb-3 uppercase tracking-wide">
            {hasPosts ? "Continuer" : "Quoi faire en premier"}
          </h3>
          <div className="space-y-2">
            <Link to="/upload" className="block">
              <div className="bg-card rounded-2xl p-4 shadow-card border border-border flex items-center justify-between hover:shadow-card-hover transition-shadow">
                <div className="flex items-center gap-3">
                  <Upload className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Importer du contenu</p>
                    <p className="text-[11px] text-muted-foreground">Ajoute tes posts pré-écrits</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </Link>

            {hasPosts && (
              <>
                <Link to="/calendar" className="block">
                  <div className="bg-card rounded-2xl p-4 shadow-card border border-border flex items-center justify-between hover:shadow-card-hover transition-shadow">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">Mon calendrier</p>
                        <p className="text-[11px] text-muted-foreground">Voir et publier mes posts du jour</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </Link>

                <Link to="/analytics" className="block">
                  <div className="bg-card rounded-2xl p-4 shadow-card border border-border flex items-center justify-between hover:shadow-card-hover transition-shadow">
                    <div className="flex items-center gap-3">
                      <BarChart3 className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">Mes statistiques</p>
                        <p className="text-[11px] text-muted-foreground">Découvre ce qui marche</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </Link>
              </>
            )}

            <Link to="/coach" className="block">
              <div className="bg-card rounded-2xl p-4 shadow-card border border-border flex items-center justify-between hover:shadow-card-hover transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#25D366]/15 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-[#25D366]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Contacter ma coach</p>
                    <p className="text-[11px] text-muted-foreground">Une question ? Écris sur WhatsApp</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </Link>
          </div>
        </section>
      </div>
      <BottomNav />
    </div>
  );
}
