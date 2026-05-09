import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { createChallenge } from "@/lib/challenges";
import { toast } from "sonner";

export const Route = createFileRoute("/challenge/create")({
  component: CreateChallengePage,
  head: () => ({
    meta: [{ title: "Créer un challenge — Routine Post" }],
  }),
});

function CreateChallengePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [duree, setDuree] = useState<7 | 14 | 30>(7);
  const [prive, setPrive] = useState(false);
  const [welcome, setWelcome] = useState("");
  const [postPts, setPostPts] = useState(10);
  const [loginPts, setLoginPts] = useState(5);
  const [interPts, setInterPts] = useState(2);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titre.trim()) return;
    setSubmitting(true);
    try {
      const res = await createChallenge({
        titre: titre.trim(),
        description: description.trim(),
        duree,
        prive,
        message_bienvenue: welcome.trim(),
        scoring_rules: { post: postPts, daily_login: loginPts, interaction: interPts },
      });
      toast.success("Challenge créé 🎉");
      navigate({ to: "/challenge/$id", params: { id: res.id } });
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <Link to="/analytics" className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Retour
        </Link>

        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Créer un challenge</h1>
        </div>
        <p className="text-xs text-muted-foreground mb-5">
          Lance ton défi et invite d'autres vendeuses à participer.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1">Nom du challenge</label>
            <input
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              required
              maxLength={80}
              className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground"
              placeholder="Ex : 30 jours de posts"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={300}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground"
              placeholder="À quoi sert ce challenge ?"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-1">Durée</label>
            <div className="grid grid-cols-3 gap-2">
              {[7, 14, 30].map((d) => (
                <button
                  type="button"
                  key={d}
                  onClick={() => setDuree(d as 7 | 14 | 30)}
                  className={`py-2 rounded-lg text-sm font-semibold border ${
                    duree === d
                      ? "bg-primary text-white border-primary"
                      : "bg-card text-foreground border-border"
                  }`}
                >
                  {d} jours
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-1">Visibilité</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPrive(false)}
                className={`py-2 rounded-lg text-sm font-semibold border ${
                  !prive ? "bg-primary text-white border-primary" : "bg-card text-foreground border-border"
                }`}
              >
                Public
              </button>
              <button
                type="button"
                onClick={() => setPrive(true)}
                className={`py-2 rounded-lg text-sm font-semibold border ${
                  prive ? "bg-primary text-white border-primary" : "bg-card text-foreground border-border"
                }`}
              >
                Privé (lien)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-1">Message de bienvenue</label>
            <textarea
              value={welcome}
              onChange={(e) => setWelcome(e.target.value)}
              maxLength={200}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground"
              placeholder="Bienvenue ! Prête à relever le défi ?"
            />
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
            <p className="text-sm font-semibold text-foreground mb-3">Règles de points</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-foreground flex-1">Post publié</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={postPts}
                  onChange={(e) => setPostPts(Number(e.target.value))}
                  className="w-20 px-2 py-1 rounded border border-border bg-card text-foreground text-right"
                />
                <span className="text-xs text-muted-foreground w-8">pts</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-foreground flex-1">Connexion quotidienne</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={loginPts}
                  onChange={(e) => setLoginPts(Number(e.target.value))}
                  className="w-20 px-2 py-1 rounded border border-border bg-card text-foreground text-right"
                />
                <span className="text-xs text-muted-foreground w-8">pts</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-foreground flex-1">Interaction reçue</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={interPts}
                  onChange={(e) => setInterPts(Number(e.target.value))}
                  className="w-20 px-2 py-1 rounded border border-border bg-card text-foreground text-right"
                />
                <span className="text-xs text-muted-foreground w-8">pts</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-primary text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Créer le challenge
          </button>
          <p className="text-xs text-muted-foreground text-center">
            Limite : 1 challenge créé par mois en offre gratuite.
          </p>
        </form>
      </div>
    </div>
  );
}
