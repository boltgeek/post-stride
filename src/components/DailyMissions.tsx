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

const CATEGORIES = Object.keys(CATEGORY_META);

type CatalogMission = {
  id: string;
  category: string;
  text: string;
};

type DailyMissionRow = {
  id: string;
  mission_id: string;
  category: string;
  completed_at: string | null;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

export function DailyMissions() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const loadFallback = async () => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    const userId = authData.user?.id;
    if (!userId) throw new Error("Not authenticated");

    const missionDate = todayISO();
    const fetchDailyRows = async () => {
      const { data, error } = await (supabase as any)
        .from("user_daily_missions")
        .select("id, mission_id, category, completed_at")
        .eq("user_id", userId)
        .eq("mission_date", missionDate);
      if (error) throw error;
      return (data || []) as DailyMissionRow[];
    };

    let rows = await fetchDailyRows();
    const existingCategories = new Set(rows.map((m) => m.category));
    const missingCategories = CATEGORIES.filter((category) => !existingCategories.has(category));

    if (missingCategories.length > 0) {
      const { data: catalog, error: catalogError } = await (supabase as any)
        .from("missions_catalog")
        .select("id, category, text")
        .in("category", missingCategories);
      if (catalogError) throw catalogError;

      const rowsToCreate = missingCategories
        .map((category) => {
          const options = ((catalog || []) as CatalogMission[]).filter((m) => m.category === category);
          const picked = options[Math.floor(Math.random() * options.length)];
          return picked
            ? { user_id: userId, mission_date: missionDate, mission_id: picked.id, category }
            : null;
        })
        .filter(Boolean);

      if (rowsToCreate.length > 0) {
        const { error: insertError } = await (supabase as any)
          .from("user_daily_missions")
          .upsert(rowsToCreate, {
            onConflict: "user_id,mission_date,category",
            ignoreDuplicates: true,
          });
        if (insertError) throw insertError;
        rows = await fetchDailyRows();
      }
    }

    const missionIds = [...new Set(rows.map((row) => row.mission_id))];
    const { data: texts, error: textsError } = await (supabase as any)
      .from("missions_catalog")
      .select("id, text")
      .in("id", missionIds);
    if (textsError) throw textsError;

    const textById = new Map(((texts || []) as Pick<CatalogMission, "id" | "text">[]).map((m) => [m.id, m.text]));

    return rows
      .map((row) => ({
        id: row.id,
        mission_id: row.mission_id,
        category: row.category,
        text: textById.get(row.mission_id) || "",
        completed_at: row.completed_at,
      }))
      .filter((mission) => mission.text)
      .sort((a, b) => CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category));
  };

  const load = async () => {
    try {
      const { data, error } = await (supabase as any).rpc("get_or_create_daily_missions");
      if (error) {
        console.warn("Daily missions RPC failed, using client fallback", error);
        setMissions(await loadFallback());
        return;
      }

      const loadedMissions = (data || []) as Mission[];
      setMissions(loadedMissions.length > 0 ? loadedMissions : await loadFallback());
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
