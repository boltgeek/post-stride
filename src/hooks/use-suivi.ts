import { useEffect, useState, useCallback } from "react";
import { loadSuivi, saveSuivi } from "@/lib/suivi-store";

export function useSuivi() {
  const [data, setData] = useState(loadSuivi);

  useEffect(() => {
    const onUpdate = () => setData(loadSuivi());
    window.addEventListener("suivi-updated", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("suivi-updated", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, []);

  const update = useCallback((updater: (d: ReturnType<typeof loadSuivi>) => ReturnType<typeof loadSuivi>) => {
    const next = updater(loadSuivi());
    saveSuivi(next);
    setData(next);
  }, []);

  return { data, update };
}
