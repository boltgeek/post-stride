import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Sparkles, Upload, Calendar, Bot, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import heroImage from "@/assets/landing-hero.jpg";
import avatar1 from "@/assets/avatar-1.png";
import avatar2 from "@/assets/avatar-2.png";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Routine Post — Ton assistant contenu Facebook" },
      {
        name: "description",
        content:
          "Importe ton contenu, organise ton calendrier et reste régulière sur Facebook — sans stress. Gratuit, sans carte bancaire.",
      },
      { property: "og:title", content: "Routine Post — Ton assistant contenu" },
      {
        property: "og:description",
        content: "Poste chaque jour, sans réfléchir. Ton CM automatique pour Facebook.",
      },
      { property: "og:image", content: heroImage },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://routinepost.com/" }],
  }),
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/home" });
    }
  }, [loading, user, navigate]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F5F0EB" }}>
      {/* Nav */}
      <header className="w-full">
        <nav className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "#E8521A" }}
            >
              <Sparkles className="w-5 h-5 text-white" />
            </span>
            <span className="text-lg font-extrabold tracking-tight text-neutral-900">
              Routine Post
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/login">
              <Button
                variant="outline"
                className="rounded-xl border-neutral-300 text-neutral-900 hover:bg-white font-semibold"
              >
                Connexion
              </Button>
            </Link>
            <Link to="/login">
              <Button
                className="rounded-xl text-white font-semibold shadow-sm"
                style={{ backgroundColor: "#E8521A" }}
              >
                Commencer gratuitement
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-10 pb-16 text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-neutral-900 leading-[1.05]">
          Poste chaque jour,
          <br />
          sans réfléchir
        </h1>
        <p className="mt-6 text-base sm:text-lg text-neutral-700 max-w-xl mx-auto">
          Importe ton contenu, organise ton calendrier et reste régulière sur Facebook — sans stress.
        </p>
        <div className="mt-8 flex justify-center">
          <Link to="/login">
            <Button
              className="rounded-xl text-white font-bold h-14 px-8 text-base shadow-md hover:opacity-95"
              style={{ backgroundColor: "#E8521A" }}
            >
              Commencer gratuitement
            </Button>
          </Link>
        </div>
        <p className="mt-4 text-sm text-neutral-600">
          ✓ Gratuit &nbsp;•&nbsp; ✓ Sans carte bancaire &nbsp;•&nbsp; ✓ Prêt en 2 minutes
        </p>

        <div className="mt-12 flex justify-center">
          <img
            src={heroImage}
            alt="Entrepreneuse souriante utilisant Routine Post sur son ordinateur"
            width={1024}
            height={768}
            className="rounded-2xl shadow-xl w-full max-w-2xl object-cover"
          />
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-900">
            Comment ça marche
          </h2>
          <p className="mt-2 text-neutral-600">2 étapes simples pour démarrer</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              n: 1,
              icon: Upload,
              avatar: avatar1,
              title: "Importe ton contenu",
              desc: "Ajoute tes posts pré-écrits (texte, Word ou PDF). Routine Post les organise pour toi.",
            },
            {
              n: 2,
              icon: Calendar,
              avatar: avatar2,
              title: "Suis ton calendrier",
              desc: "Visualise tous tes posts jour par jour et ne rate plus jamais une publication.",
            },
          ].map((s) => (
            <div
              key={s.n}
              className="bg-white rounded-2xl p-7 shadow-sm border border-neutral-200 relative"
            >
              <div
                className="absolute -top-4 left-7 w-9 h-9 rounded-full text-white font-bold flex items-center justify-center shadow"
                style={{ backgroundColor: "#E8521A" }}
              >
                {s.n}
              </div>
              <div className="flex items-start gap-4">
                <img
                  src={s.avatar}
                  alt=""
                  loading="lazy"
                  width={64}
                  height={64}
                  className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                  style={{ backgroundColor: "#F5F0EB" }}
                />
                <div>
                  <h3 className="text-lg font-bold text-neutral-900 mb-1">{s.title}</h3>
                  <p className="text-sm text-neutral-700 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Coming soon */}
      <section style={{ backgroundColor: "#FBE6DA" }}>
        <div className="max-w-5xl mx-auto px-6 py-16">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-900">
              Bientôt disponible 🚀
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                icon: Bot,
                title: "🤖 Génération de contenu par IA",
                desc: "L'IA créera ton calendrier de posts en quelques secondes.",
              },
              {
                icon: Send,
                title: "📲 Publication directe sur Facebook",
                desc: "Publie sur ta Page Facebook directement depuis l'app.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="bg-white/70 rounded-2xl p-7 border border-neutral-200 opacity-80 relative"
              >
                <span
                  className="absolute top-4 right-4 text-[11px] font-bold px-2.5 py-1 rounded-full text-white"
                  style={{ backgroundColor: "#E8521A" }}
                >
                  Bientôt
                </span>
                <h3 className="text-lg font-bold text-neutral-700 mb-2 pr-20">{f.title}</h3>
                <p className="text-sm text-neutral-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-neutral-700 mt-8">
            Tu seras notifiée dès que ces fonctionnalités sont disponibles.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ backgroundColor: "#E8521A" }}>
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            Prête à rester régulière sur Facebook ?
          </h2>
          <div className="mt-8 flex justify-center">
            <Link to="/login">
              <Button className="rounded-xl bg-white text-neutral-900 hover:bg-neutral-100 font-bold h-14 px-8 text-base shadow-md">
                Créer mon compte gratuitement
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-white/90">Gratuit • Sans carte bancaire</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-neutral-600">© 2025 Routine Post</p>
          <nav className="flex items-center gap-6 text-sm text-neutral-700">
            <a href="/privacy" className="hover:text-neutral-900">Politique de confidentialité</a>
            <a href="/terms" className="hover:text-neutral-900">Conditions d'utilisation</a>
            <Link to="/coach" className="hover:text-neutral-900">Contact</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
