import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { MessageCircle, Sparkles, Heart, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";
import { useAppData } from "@/hooks/use-app-data";

export const Route = createFileRoute("/coach")({
  component: CoachPage,
  head: () => ({
    meta: [
      { title: "Mon coach — PostPilot" },
      { name: "description", content: "Contacte ta coach business sur WhatsApp" },
    ],
  }),
});

const COACH_WHATSAPP = "237655948452"; // sans + ni espace pour wa.me

function CoachPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { streak, level, totalPoints, posts } = useAppData();

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const firstName =
    (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ||
    (user.user_metadata?.name as string | undefined)?.split(" ")[0] ||
    user.email?.split("@")[0] ||
    "moi";

  const message = `Bonjour 👋 Je suis ${firstName}, j'utilise PostPilot (niveau ${level}, ${streak} jour${streak > 1 ? "s" : ""} de régularité, ${totalPoints} pts, ${posts.length} posts planifiés). J'aimerais ton aide pour :`;

  const waLink = `https://wa.me/${COACH_WHATSAPP}?text=${encodeURIComponent(message)}`;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <header className="mb-6">
          <h1 className="text-xl font-bold text-foreground">Mon coach</h1>
          <p className="text-xs text-muted-foreground">Une question ? Un blocage ? Écris-moi.</p>
        </header>

        {/* Coach card */}
        <div className="bg-card rounded-2xl p-6 shadow-card border border-border text-center mb-6 animate-slide-up">
          <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4 shadow-primary">
            <Sparkles className="w-10 h-10 text-primary-foreground" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-1">Ta coach business</h2>
          <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
            Conseils personnalisés, idées de posts, stratégie ventes. Réponse sous 24h.
          </p>

          <a href={waLink} target="_blank" rel="noopener noreferrer" className="block">
            <Button className="w-full rounded-xl h-14 text-base font-semibold bg-[#25D366] hover:bg-[#1fbb59] text-white shadow-primary">
              <MessageCircle className="w-5 h-5 mr-2" />
              Contacter ma coach sur WhatsApp
            </Button>
          </a>
          <p className="text-[11px] text-muted-foreground mt-3">
            Tu seras redirigée vers WhatsApp avec un message déjà prêt
          </p>
        </div>

        {/* Suggestions */}
        <h3 className="text-sm font-bold text-foreground mb-3 uppercase tracking-wide">
          Pourquoi contacter ta coach ?
        </h3>
        <div className="space-y-3">
          {[
            { icon: Heart, title: "Tu manques d'idées", desc: "Elle t'aide à trouver des angles qui parlent à ta cliente." },
            { icon: TrendingUp, title: "Tes posts ne marchent pas", desc: "Elle analyse et te donne des pistes concrètes." },
            { icon: Sparkles, title: "Tu veux passer au niveau supérieur", desc: "Stratégie de contenu, offres, conversion." },
          ].map((it) => {
            const Icon = it.icon;
            return (
              <div key={it.title} className="bg-card rounded-2xl p-4 shadow-card border border-border flex gap-3 items-start">
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground mb-0.5">{it.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{it.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
