import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock, Loader2, ArrowLeft, CheckCircle2, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/account")({
  component: AccountPage,
  head: () => ({
    meta: [
      { title: "Mon compte — Routine Post" },
      { name: "description", content: "Gère ton compte et ton mot de passe" },
    ],
  }),
});

function AccountPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameSuccess, setNameSuccess] = useState("");

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSuccess("Mot de passe mis à jour ✨");
    setPassword("");
    setConfirm("");
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <header className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate({ to: "/calendar" })}
              className="p-2 -ml-2 rounded-xl hover:bg-accent transition-colors"
              aria-label="Retour"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-foreground">Mon compte</h1>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={async () => {
              await signOut();
              navigate({ to: "/" });
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-destructive border border-destructive/30 rounded-xl px-3 py-2 hover:bg-destructive/10 transition-colors flex-shrink-0"
            aria-label="Se déconnecter"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </header>

        <BadgesSection userId={user.id} />

        <div className="bg-card rounded-2xl p-5 shadow-card border border-border animate-slide-up">
          <h2 className="text-sm font-bold text-foreground mb-1 uppercase tracking-wide">
            Changer mon mot de passe
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            Choisis un nouveau mot de passe d'au moins 6 caractères.
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nouveau mot de passe"
                required
                minLength={6}
                className="w-full rounded-xl border border-input bg-background pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirme le mot de passe"
                required
                minLength={6}
                className="w-full rounded-xl border border-input bg-background pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}
            {success && (
              <p className="text-xs text-success flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {success}
              </p>
            )}

            <Button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl gradient-primary text-primary-foreground shadow-primary h-12 text-base font-semibold"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Mettre à jour"}
            </Button>
          </form>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

const BADGE_META: Record<string, { emoji: string; label: string }> = {
  championne: { emoji: "👑", label: "Championne" },
  finaliste: { emoji: "🥈", label: "Finaliste" },
  top3: { emoji: "🥉", label: "Top 3" },
};

function BadgesSection({ userId }: { userId: string }) {
  const [badges, setBadges] = useState<Array<{ id: string; badge_type: string; awarded_at: string; titre: string | null }>>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("user_badges")
        .select("id, badge_type, awarded_at, challenge_id")
        .eq("user_id", userId)
        .order("awarded_at", { ascending: false });
      const list = data ?? [];
      const ids = list.map((b: any) => b.challenge_id);
      const titres: Record<string, string> = {};
      if (ids.length) {
        const { data: chs } = await supabase.from("challenges").select("id, titre").in("id", ids);
        (chs ?? []).forEach((c: any) => (titres[c.id] = c.titre));
      }
      setBadges(list.map((b: any) => ({ ...b, titre: titres[b.challenge_id] ?? null })));
    })();
  }, [userId]);
  if (badges.length === 0) return null;
  return (
    <div className="bg-card rounded-2xl p-5 shadow-card border border-border mb-4">
      <h2 className="text-sm font-bold text-foreground mb-3 uppercase tracking-wide">Mes badges</h2>
      <div className="flex flex-wrap gap-2">
        {badges.map((b) => {
          const meta = BADGE_META[b.badge_type] ?? { emoji: "🏅", label: b.badge_type };
          return (
            <div key={b.id} className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-full px-3 py-1.5">
              <span className="text-lg" aria-hidden>{meta.emoji}</span>
              <div className="leading-tight">
                <p className="text-xs font-semibold text-foreground">{meta.label}</p>
                {b.titre && <p className="text-[10px] text-muted-foreground">{b.titre}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

