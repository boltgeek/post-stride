import { useCallback, useEffect, useState } from "react";
import type { Post } from "@/lib/store";

const STORAGE_KEY = "postpilot_notifications_enabled";

type PermissionState = "default" | "granted" | "denied" | "unsupported";

export function useNotifications() {
  const [permission, setPermission] = useState<PermissionState>("default");
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission as PermissionState);
    setEnabled(localStorage.getItem(STORAGE_KEY) === "true" && Notification.permission === "granted");
  }, []);

  const enable = useCallback(async () => {
    if (!("Notification" in window)) return false;
    let perm = Notification.permission;
    if (perm === "default") {
      perm = await Notification.requestPermission();
    }
    setPermission(perm as PermissionState);
    if (perm === "granted") {
      localStorage.setItem(STORAGE_KEY, "true");
      setEnabled(true);
      // Welcome notification to confirm
      try {
        new Notification("PostPilot 🔥", {
          body: "Notifications activées ! Tu recevras un rappel à chaque heure de publication.",
          icon: "/icon-512.png",
          badge: "/icon-512.png",
        });
      } catch {
        /* ignore */
      }
      return true;
    }
    return false;
  }, []);

  const disable = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "false");
    setEnabled(false);
  }, []);

  return { permission, enabled, enable, disable };
}

/**
 * Schedule browser notifications for today's pending posts.
 * Uses setTimeout — only works while the tab is open.
 * Notifications fire at the scheduled time of each pending post.
 */
export function useScheduleDailyReminders(posts: Post[], enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const today = new Date().toISOString().slice(0, 10);
    const now = Date.now();
    const timeouts: number[] = [];

    const todayPending = posts.filter(
      (p) => p.scheduledDate === today && p.status === "pending"
    );

    todayPending.forEach((post) => {
      const [h, m] = post.scheduledTime.split(":").map(Number);
      const target = new Date();
      target.setHours(h, m, 0, 0);
      const delay = target.getTime() - now;
      if (delay <= 0 || delay > 86400000) return; // skip past or far-future

      const id = window.setTimeout(() => {
        try {
          new Notification("⏰ C'est l'heure de poster !", {
            body: `${post.content.slice(0, 80)}${post.content.length > 80 ? "…" : ""}\n\nGarde ton streak 🔥`,
            icon: "/icon-512.png",
            badge: "/icon-512.png",
            tag: `post-${post.id}`,
          });
        } catch {
          /* ignore */
        }
      }, delay);
      timeouts.push(id);
    });

    // End-of-day fallback reminder if user hasn't published anything today by 20:00
    const endOfDayReminder = new Date();
    endOfDayReminder.setHours(20, 0, 0, 0);
    const eodDelay = endOfDayReminder.getTime() - now;
    if (eodDelay > 0 && todayPending.length > 0) {
      const id = window.setTimeout(() => {
        const stillPending = posts.filter(
          (p) => p.scheduledDate === today && p.status === "pending"
        );
        if (stillPending.length > 0) {
          try {
            new Notification("🔥 Ton streak est en danger !", {
              body: `Il te reste ${stillPending.length} post${stillPending.length > 1 ? "s" : ""} à publier aujourd'hui.`,
              icon: "/icon-512.png",
              badge: "/icon-512.png",
              tag: "eod-reminder",
            });
          } catch {
            /* ignore */
          }
        }
      }, eodDelay);
      timeouts.push(id);
    }

    return () => {
      timeouts.forEach((id) => window.clearTimeout(id));
    };
  }, [posts, enabled]);
}
