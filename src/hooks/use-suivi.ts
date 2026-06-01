import { useEffect, useState, useCallback } from "react";
import { loadSuivi, saveSuivi } from "@/lib/suivi-store";
import { useAuth } from "@/lib/auth";

export function useSuivi() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [data, setData] = useState(() => loadSuivi(userId));

  // Reload whenever the signed-in user changes (login, logout, switch).
  useEffect(() => {
    setData(loadSuivi(userId));
  }, [userId]);

  useEffect(() => {
    const onUpdate = () => setData(loadSuivi(userId));
    window.addEventListener("suivi-updated", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("suivi-updated", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, [userId]);

  const update = useCallback(
    (updater: (d: ReturnType<typeof loadSuivi>) => ReturnType<typeof loadSuivi>) => {
      if (!userId) return; // never persist without a user
      const next = updater(loadSuivi(userId));
      saveSuivi(next, userId);
      setData(next);
    },
    [userId]
  );

  return { data, update };
}
