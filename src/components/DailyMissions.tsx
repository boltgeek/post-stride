import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Check, Loader2 } from "lucide-react";

type Mission = {
  id: string;
  mission_id: string;
  category: string;
  text: string;
  completed_at: string | null;
};

const CATEGORY_META: Record<string, { emoji: string; label: string }> = {
  marketplace: { emoji: "🛒", label: "Marketplace" },
  prospection: { emoji: "🎯", label: "Prospection" },
  carnet: { emoji: "📓", label: "Carnet" },
  relance: { emoji: "🔄", label: "Relance" },
  contenu: { emoji: "📢", label: "Contenu" },
};

export function DailyMissions() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = async () => {
    try {
      const { data, error } = await (supabase as any).rpc("get_or_create_daily_missions");
      if (error) throw error;
      setMissions((data || []) as Mission[]);
    } catch (e) {
      console.error("Load missions failed", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = async (m: Mission) => {
    const newState = !m.completed_at;
    setToggling(m.id);
    // optimistic
    setMissions((prev) =>
      prev.map((x) =>
        x.id === m.id ? { ...x, completed_at: newState ? new Date().toISOString() : null } : x
      )
    );
    try {
      const { error } = await (supabase as any).rpc("toggle_daily_mission", {
        _id: m.id,
        _completed: newState,
      });
      if (error) throw error;
    } catch (e) {
      console.error("Toggle failed", e);
      // revert
      setMissions((prev) =>
        prev.map((x) => (x.id === m.id ? m : x))
      );
    } finally {
      setToggling(null);
    }
  };

  const completedCount = missions.filter((m) => m.completed_at).length;
  const allDone = missions.length > 0 && completedCount === missions.length;

  if (loading) {
    return (
      <section className="bg-card rounded-3xl p-5 border border-border shadow-card flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </section>
    );
  }

  return (
    <section className="bg-card rounded-3xl p-5 border border-border shadow-card animate-slide-up">
      <div className="flex items-center justify-between mb-3">
        <p className="text-base font-extrabold text-foreground">⚡ Tes missions du jour</p>
        <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
          {completedCount}/{missions.length} complétées
        </span>
      </div>

      {/* progress bar */}
      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mb-4">
        <div
          className="h-full gradient-primary transition-all"
          style={{ width: `${(completedCount / Math.max(missions.length, 1)) * 100}%` }}
        />
      </div>

      <ul className="space-y-2">
        {missions.map((m) => {
          const done = !!m.completed_at;
          const meta = CATEGORY_META[m.category] || { emoji: "✨", label: m.category };
          return (
            <li key={m.id}>
              <button
                onClick={() => toggle(m)}
                disabled={toggling === m.id}
                className={`w-full text-left flex items-start gap-3 rounded-2xl p-3 border transition-all tap-press ${
                  done
                    ? "bg-success/5 border-success/30"
                    : "bg-background border-border hover:border-primary/40"
                }`}
              >
                <div
                  className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                    done
                      ? "bg-success border-success"
                      : "border-muted-foreground/40 bg-card"
                  }`}
                >
                  {done && <Check className="w-4 h-4 text-success-foreground" strokeWidth={3} />}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-base mr-1">{meta.emoji}</span>
                  <span
                    className={`text-sm leading-snug ${
                      done ? "line-through text-muted-foreground" : "text-foreground"
                    }`}
                  >
                    {m.text}
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {allDone && (
        <div className="mt-4 rounded-2xl bg-success/10 border border-success/30 text-success px-4 py-3 text-sm font-bold text-center">
          ✅ Journée complète !
        </div>
      )}
    </section>
  );
}
