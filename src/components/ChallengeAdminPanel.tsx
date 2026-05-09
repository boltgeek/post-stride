import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, X, AlertTriangle, Loader2 } from "lucide-react";

interface Participant {
  id: string;
  user_id: string | null;
  display_name: string;
  score: number;
  rank: number;
  suspendue_jusqu_au?: string | null;
}

interface Penalty {
  id: string;
  user_id: string;
  points_retires: number;
  motif: string;
  suspendue_jusqu_au: string | null;
  applied_at: string;
}

export function ChallengeAdminPanel({
  challengeId,
  challengeTitle,
  participants,
  onClose,
  onAfterAction,
  onDeleted,
}: {
  challengeId: string;
  challengeTitle: string;
  participants: Participant[];
  onClose: () => void;
  onAfterAction: () => void;
  onDeleted: () => void;
}) {
  const [tab, setTab] = useState<"participants" | "penalties" | "challenge">("participants");
  const [penaltyFor, setPenaltyFor] = useState<Participant | null>(null);
  const [history, setHistory] = useState<Penalty[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tab !== "penalties") return;
    supabase
      .from("challenge_penalties")
      .select("*")
      .eq("challenge_id", challengeId)
      .order("applied_at", { ascending: false })
      .then(({ data }) => setHistory((data as any) || []));
  }, [tab, challengeId]);

  const nameOf = (uid: string) =>
    participants.find((p) => p.user_id === uid)?.display_name || "Vendeuse";

  const removeParticipant = async (p: Participant) => {
    if (!p.user_id) return;
    if (!window.confirm(`Es-tu sûre de vouloir supprimer ${p.display_name} du challenge ? Cette action est irréversible.`)) return;
    setLoading(true);
    const { error } = await supabase.rpc("remove_challenge_participant" as any, {
      _challenge_id: challengeId,
      _user_id: p.user_id,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success(`${p.display_name} a été retirée du challenge`);
    onAfterAction();
  };

  const closeNow = async () => {
    if (!window.confirm("Es-tu sûre de vouloir clôturer ce challenge maintenant ? Le classement sera figé immédiatement.")) return;
    setLoading(true);
    const { error } = await supabase.rpc("close_challenge_now" as any, { _challenge_id: challengeId });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Challenge clôturé. Badges attribués 🏆");
    onAfterAction();
    onClose();
  };

  const deleteChallenge = async () => {
    if (!window.confirm("Es-tu sûre de vouloir supprimer ce challenge ? Toutes les données seront perdues. Cette action est irréversible.")) return;
    setLoading(true);
    const { error } = await supabase.rpc("delete_challenge_cascade" as any, { _challenge_id: challengeId });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Challenge supprimé");
    onDeleted();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-card w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Administration</p>
            <h2 className="text-base font-bold text-foreground truncate">{challengeTitle}</h2>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="p-2 rounded-lg hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-1 p-2 border-b border-border">
          {(["participants", "penalties", "challenge"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold ${
                tab === t ? "bg-primary text-white" : "text-muted-foreground"
              }`}
            >
              {t === "participants" ? "Participantes" : t === "penalties" ? "Pénalités" : "Challenge"}
            </button>
          ))}
        </div>

        <div className="p-4 space-y-3">
          {tab === "participants" && (
            <>
              {participants.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">Aucune participante</p>
              )}
              {participants.map((p) => (
                <div key={p.id} className="bg-muted/40 rounded-xl p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">
                    {p.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{p.display_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.score} pts
                      {p.suspendue_jusqu_au && new Date(p.suspendue_jusqu_au) > new Date() && (
                        <span className="ml-2 text-warning">⏸ Suspendue</span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => setPenaltyFor(p)}
                    className="text-xs px-2 py-1 rounded-lg border border-border text-foreground"
                  >
                    Pénalité
                  </button>
                  <button
                    onClick={() => removeParticipant(p)}
                    disabled={loading}
                    aria-label="Supprimer"
                    className="p-2 rounded-lg text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </>
          )}

          {tab === "penalties" && (
            <>
              <p className="text-xs text-muted-foreground mb-2">Historique des pénalités appliquées</p>
              {history.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">Aucune pénalité appliquée</p>
              )}
              {history.map((h) => (
                <div key={h.id} className="bg-muted/40 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-foreground">{nameOf(h.user_id)}</p>
                    <p className="text-sm font-bold text-destructive">-{h.points_retires} pts</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{h.motif}</p>
                  {h.suspendue_jusqu_au && (
                    <p className="text-xs text-warning mt-1">
                      Suspendue jusqu'au {new Date(h.suspendue_jusqu_au).toLocaleString("fr-FR")}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(h.applied_at).toLocaleString("fr-FR")}
                  </p>
                </div>
              ))}
            </>
          )}

          {tab === "challenge" && (
            <>
              <button
                onClick={closeNow}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-warning text-white font-semibold flex items-center justify-center gap-2"
                style={{ backgroundColor: "#f59e0b" }}
              >
                <AlertTriangle className="w-4 h-4" /> Clôturer maintenant
              </button>
              <p className="text-xs text-muted-foreground">
                Le classement sera figé immédiatement et les badges attribués au top 3.
              </p>

              <div className="h-px bg-border my-4" />

              <button
                onClick={deleteChallenge}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-destructive text-white font-semibold flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Supprimer le challenge
              </button>
              <p className="text-xs text-muted-foreground">
                Toutes les participations et pénalités seront supprimées. Tu récupères ton slot du mois.
              </p>
            </>
          )}
        </div>
      </div>

      {penaltyFor && (
        <PenaltyForm
          participant={penaltyFor}
          challengeId={challengeId}
          onClose={() => setPenaltyFor(null)}
          onApplied={() => {
            setPenaltyFor(null);
            onAfterAction();
          }}
        />
      )}
    </div>
  );
}

function PenaltyForm({
  participant,
  challengeId,
  onClose,
  onApplied,
}: {
  participant: Participant;
  challengeId: string;
  onClose: () => void;
  onApplied: () => void;
}) {
  const [points, setPoints] = useState(15);
  const [motif, setMotif] = useState("");
  const [suspend, setSuspend] = useState(false);
  const [days, setDays] = useState<1 | 2 | 3 | 7>(1);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!motif.trim()) return toast.error("Indique un motif");
    if (!participant.user_id) return;
    setLoading(true);
    const suspendUntil = suspend ? new Date(Date.now() + days * 86400000).toISOString() : null;
    const { error } = await supabase.rpc("apply_challenge_penalty" as any, {
      _challenge_id: challengeId,
      _user_id: participant.user_id,
      _points: points,
      _motif: motif.trim(),
      _suspend_until: suspendUntil,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success(`Pénalité appliquée à ${participant.display_name}`);
    onApplied();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl w-full max-w-sm p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-bold text-foreground">Pénalité — {participant.display_name}</h3>

        <label className="block text-xs text-muted-foreground">
          Retrait de points
          <input
            type="number"
            min={0}
            value={points}
            onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
          />
        </label>

        <label className="block text-xs text-muted-foreground">
          Motif
          <textarea
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder="Ex : Triche détectée, Non-respect des règles…"
            className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
            rows={3}
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={suspend} onChange={(e) => setSuspend(e.target.checked)} />
          Exclusion temporaire
        </label>

        {suspend && (
          <div className="flex gap-2">
            {[1, 2, 3, 7].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d as 1 | 2 | 3 | 7)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold border ${
                  days === d ? "bg-primary text-white border-primary" : "bg-card border-border text-foreground"
                }`}
              >
                {d}j
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-border text-sm font-medium text-foreground"
          >
            Annuler
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="flex-1 py-2 rounded-lg bg-destructive text-white text-sm font-semibold flex items-center justify-center gap-1"
          >
            {loading && <Loader2 className="w-3 h-3 animate-spin" />}
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}
