import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type GoalPeriod = "day" | "week" | "month" | "year";

export interface UserGoal {
  id: string;
  user_id: string;
  period: GoalPeriod;
  target_amount: number;
}

export function periodBounds(period: GoalPeriod, now = new Date()): { start: Date; end: Date } {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  let start = new Date(d);
  let end = new Date(d);
  if (period === "day") {
    end.setDate(end.getDate() + 1);
  } else if (period === "week") {
    // Monday as week start
    const day = (d.getDay() + 6) % 7;
    start.setDate(d.getDate() - day);
    end = new Date(start);
    end.setDate(end.getDate() + 7);
  } else if (period === "month") {
    start = new Date(d.getFullYear(), d.getMonth(), 1);
    end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  } else {
    start = new Date(d.getFullYear(), 0, 1);
    end = new Date(d.getFullYear() + 1, 0, 1);
  }
  return { start, end };
}

export const PERIOD_LABEL: Record<GoalPeriod, string> = {
  day: "Aujourd'hui",
  week: "Cette semaine",
  month: "Ce mois",
  year: "Cette année",
};

export function useGoal() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<UserGoal[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setGoals([]); setLoading(false); return; }
    const { data } = await supabase
      .from("user_goals" as any)
      .select("id, user_id, period, target_amount")
      .eq("user_id", user.id);
    setGoals(((data as any) || []).map((g: any) => ({ ...g, target_amount: Number(g.target_amount) })));
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`user_goals_${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_goals", filter: `user_id=eq.${user.id}` }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, refresh]);

  const saveGoal = useCallback(async (period: GoalPeriod, target_amount: number) => {
    if (!user) return;
    await supabase.from("user_goals" as any).upsert(
      { user_id: user.id, period, target_amount },
      { onConflict: "user_id,period" }
    );
    await refresh();
  }, [user, refresh]);

  const deleteGoal = useCallback(async (period: GoalPeriod) => {
    if (!user) return;
    await supabase.from("user_goals" as any).delete().eq("user_id", user.id).eq("period", period);
    await refresh();
  }, [user, refresh]);

  return { goals, loading, saveGoal, deleteGoal };
}
