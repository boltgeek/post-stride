import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ExternalLink, CheckCircle2, Clock, Lock } from "lucide-react";

interface Props {
  challengeId: string;
}

interface Assignment {
  id: string;
  assignee_user_id: string;
  display_name: string;
  slot_time: string;
  completed_at: string | null;
}

interface MyPost {
  post_id: string | null;
  facebook_url: string | null;
  confirmed_at: string | null;
  total: number;
  done: number;
  assignments: Assignment[];
}

interface MyAssignment {
  id: string;
  slot_time: string;
  facebook_url: string;
  owner_user_id: string;
  owner_name: string;
  completed_at: string | null;
}

const SLOTS: Array<{ time: string; hour: number }> = [
  { time: "10:00", hour: 10 },
  { time: "11:00", hour: 11 },
  { time: "12:00", hour: 12 },
  { time: "13:00", hour: 13 },
  { time: "14:00", hour: 14 },
  { time: "15:00", hour: 15 },
  { time: "16:00", hour: 16 },
  { time: "17:00", hour: 17 },
  { time: "18:00", hour: 18 },
  { time: "19:00", hour: 19 },
];

function isSlotUnlocked(slotTime: string): boolean {
  const [h] = slotTime.split(":").map(Number);
  return new Date().getHours() >= h;
}

export function CommunitySupportBlock({ challengeId }: Props) {
  const [tab, setTab] = useState<"mine" | "assigned">("mine");
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const myPostQ = useQuery({
    queryKey: ["community-mine", challengeId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_my_community_post_today", {
        _challenge_id: challengeId,
      });
      if (error) throw error;
      const row = (data && data[0]) || {};
      return {
        post_id: row.post_id ?? null,
        facebook_url: row.facebook_url ?? null,
        confirmed_at: row.confirmed_at ?? null,
        total: row.total ?? 0,
        done: row.done ?? 0,
        assignments: row.assignments ?? [],
      } as MyPost;
    },
  });

  const assignedQ = useQuery({
    queryKey: ["community-assigned", challengeId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_my_community_assignments_today", {
        _challenge_id: challengeId,
      });
      if (error) throw error;
      return (data || []) as MyAssignment[];
    },
  });

  // Tick every minute so locked slots auto-unlock without reload
  const [, force] = useState(0);
  useEffect(() => {
    const i = setInterval(() => force((x) => x + 1), 60_000);
    return () => clearInterval(i);
  }, []);

  const submit = async () => {
    const trimmed = url.trim();
    if (!trimmed.match(/^https?:\/\/.+/i)) {
      toast.error("Colle un lien valide commençant par https://");
      return;
    }
    if (trimmed.length > 500) {
      toast.error("Lien trop long");
      return;
    }
    setSubmitting(true);
    const { error } = await (supabase as any).rpc("submit_community_post", {
      _challenge_id: challengeId,
      _url: trimmed,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Lien envoyé — tes soutiens ont été assignés 🎉");
    setUrl("");
    myPostQ.refetch();
  };

  const markDone = async (id: string) => {
    const { error } = await (supabase as any).rpc("mark_assignment_done", { _assignment_id: id });
    if (error) return toast.error(error.message);
    toast.success("Soutien validé ✅");
    assignedQ.refetch();
  };

  const confirm = async () => {
    if (!myPostQ.data?.post_id) return;
    setConfirming(true);
    const { error } = await (supabase as any).rpc("confirm_community_post", {
      _post_id: myPostQ.data.post_id,
    });
    setConfirming(false);
    if (error) return toast.error(error.message);
    toast.success("Interactions confirmées — points attribués 🚀");
    myPostQ.refetch();
  };

  const mine = myPostQ.data;
  const assigned = assignedQ.data || [];
  const assignedTotal = assigned.length;
  const assignedDone = assigned.filter((a) => a.completed_at).length;

  const groupedBySlot = SLOTS.map((s) => ({
    ...s,
    items: assigned.filter((a) => a.slot_time === s.time),
  }));

  return (
    <div className="bg-card rounded-2xl p-4 shadow-card border border-border mb-5">
      <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        🤝 Soutien communautaire
      </p>

      <div className="flex gap-1 mb-4 bg-muted/40 rounded-lg p-1">
        <button
          onClick={() => setTab("mine")}
          className={`flex-1 py-2 rounded-md text-xs font-semibold transition-colors ${
            tab === "mine" ? "bg-primary text-white" : "text-muted-foreground"
          }`}
        >
          Mon post du jour
        </button>
        <button
          onClick={() => setTab("assigned")}
          className={`flex-1 py-2 rounded-md text-xs font-semibold transition-colors ${
            tab === "assigned" ? "bg-primary text-white" : "text-muted-foreground"
          }`}
        >
          Mes soutiens
        </button>
      </div>

      {tab === "mine" && (
        <div className="space-y-3">
          <div>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Colle ici le lien de ton post Facebook"
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground"
              maxLength={500}
            />
            <button
              onClick={submit}
              disabled={submitting || !url.trim()}
              className="mt-2 w-full py-2.5 rounded-lg bg-primary text-white text-sm font-semibold flex items-center justify-center gap-1 disabled:opacity-50"
              style={{ backgroundColor: "#ec7a3c" }}
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Envoyer mon lien
            </button>
          </div>

          {myPostQ.isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            </div>
          ) : mine && mine.post_id ? (
            <div className="pt-2 border-t border-border">
              <p className="text-sm font-semibold text-foreground mb-2">
                Interactions reçues sur mon post
              </p>
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">
                    {mine.done} / {mine.total} interactions reçues
                  </span>
                  <span className="font-semibold text-foreground">
                    {mine.total > 0 ? Math.round((mine.done / mine.total) * 100) : 0}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${mine.total > 0 ? (mine.done / mine.total) * 100 : 0}%`,
                      backgroundColor: "#ec7a3c",
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1.5 mb-3">
                {mine.assignments.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/40 text-xs"
                  >
                    <span className="flex-1 font-medium text-foreground truncate">
                      {a.display_name}
                    </span>
                    <span className="text-muted-foreground">{a.slot_time}</span>
                    {a.completed_at ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={confirm}
                disabled={confirming || mine.done < mine.total || !!mine.confirmed_at}
                className="w-full py-2.5 rounded-lg text-white text-sm font-semibold flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: "#ec7a3c" }}
              >
                {confirming && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {mine.confirmed_at
                  ? "Interactions confirmées ✅"
                  : "Confirmer les interactions reçues"}
              </button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-2">
              Envoie ton lien Facebook pour activer le soutien communautaire du jour.
            </p>
          )}
        </div>
      )}

      {tab === "assigned" && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">Posts à soutenir aujourd'hui</p>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">
                {assignedDone} / {assignedTotal} effectués
              </span>
              <span className="font-semibold text-foreground">
                {assignedTotal > 0 ? Math.round((assignedDone / assignedTotal) * 100) : 0}%
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${assignedTotal > 0 ? (assignedDone / assignedTotal) * 100 : 0}%`,
                  backgroundColor: "#ec7a3c",
                }}
              />
            </div>
          </div>

          {assignedQ.isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            </div>
          ) : assignedTotal === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              Aucun post à soutenir pour le moment. Reviens plus tard 👀
            </p>
          ) : (
            groupedBySlot.map((g) => {
              if (g.items.length === 0) return null;
              const unlocked = isSlotUnlocked(g.time);
              return (
                <div key={g.time} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-foreground">Créneau {g.time}</p>
                    {!unlocked && <Lock className="w-3 h-3 text-muted-foreground" />}
                  </div>
                  {g.items.map((it) => {
                    const isDone = !!it.completed_at;
                    const locked = !unlocked && !isDone;
                    return (
                      <div
                        key={it.id}
                        className={`rounded-lg p-2.5 border ${
                          locked
                            ? "bg-muted/30 border-border opacity-50"
                            : "bg-muted/40 border-border"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-xs font-medium text-foreground truncate flex-1">
                            {it.owner_name}
                          </p>
                          {isDone && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                        </div>
                        <a
                          href={locked ? undefined : it.facebook_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => {
                            if (locked) e.preventDefault();
                          }}
                          className={`inline-flex items-center gap-1 text-xs mb-1.5 ${
                            locked
                              ? "text-muted-foreground"
                              : "text-primary underline"
                          }`}
                        >
                          <ExternalLink className="w-3 h-3" />
                          {locked ? "Lien verrouillé" : "Ouvrir le post"}
                        </a>
                        {!isDone && (
                          <button
                            onClick={() => markDone(it.id)}
                            disabled={locked}
                            className="w-full mt-1 py-1.5 rounded-md text-white text-xs font-semibold disabled:opacity-40"
                            style={{ backgroundColor: "#ec7a3c" }}
                          >
                            {locked ? `Disponible à ${g.time}` : "Marquer comme fait"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
