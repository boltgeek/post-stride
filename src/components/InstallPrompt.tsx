import { useEffect, useState } from "react";
import { Share, Plus, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const STORAGE_KEY = "rp_install_state_v1";

function readState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") as {
      visits?: number;
      dismissedAt?: number;
      installed?: boolean;
    };
  } catch {
    return {};
  }
}

function writeState(s: Record<string, unknown>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Already installed (standalone)?
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari
      window.navigator.standalone === true;
    if (standalone) return;

    // Track visits
    const state = readState();
    const visits = (state.visits ?? 0) + 1;
    writeState({ ...state, visits });

    // Detect iOS Safari (no beforeinstallprompt support)
    const ua = window.navigator.userAgent;
    const iOS = /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    setIsIOS(iOS && isSafari);

    const dismissedRecently =
      state.dismissedAt && Date.now() - state.dismissedAt < 7 * 24 * 60 * 60 * 1000;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const onInstalled = () => {
      writeState({ ...readState(), installed: true });
      setShow(false);
      setDeferred(null);
    };
    window.addEventListener("appinstalled", onInstalled);

    // Show banner after 30s OR on 2nd+ visit (immediately if already returning)
    if (!dismissedRecently) {
      if (visits >= 2) {
        const t = setTimeout(() => setShow(true), 1500);
        return () => {
          clearTimeout(t);
          window.removeEventListener("beforeinstallprompt", handler);
          window.removeEventListener("appinstalled", onInstalled);
        };
      } else {
        const t = setTimeout(() => setShow(true), 30000);
        return () => {
          clearTimeout(t);
          window.removeEventListener("beforeinstallprompt", handler);
          window.removeEventListener("appinstalled", onInstalled);
        };
      }
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    writeState({ ...readState(), dismissedAt: Date.now() });
    setShow(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      writeState({ ...readState(), installed: true });
    } else {
      writeState({ ...readState(), dismissedAt: Date.now() });
    }
    setDeferred(null);
    setShow(false);
  };

  if (!show) return null;
  // Only show if Android-prompt is ready OR iOS Safari (manual instructions)
  if (!deferred && !isIOS) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] px-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <img src="/icon-192.png" alt="" className="h-12 w-12 rounded-xl" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">
              📲 Installe Routine Post sur ton téléphone
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {isIOS
                ? "Pour un accès rapide depuis ton écran d'accueil."
                : "Pour un accès rapide même hors connexion !"}
            </p>

            {isIOS ? (
              <div className="mt-3 rounded-lg bg-muted p-3 text-xs text-foreground">
                <p className="font-medium">Sur iPhone :</p>
                <ol className="mt-1 space-y-1 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span>1. Appuie sur</span>
                    <Share className="h-4 w-4 text-primary" />
                    <span>(Partager)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span>2. Choisis</span>
                    <Plus className="h-4 w-4 text-primary" />
                    <span>« Sur l'écran d'accueil »</span>
                  </li>
                </ol>
              </div>
            ) : (
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={install} className="gap-1">
                  <Download className="h-4 w-4" />
                  Installer
                </Button>
                <Button size="sm" variant="ghost" onClick={dismiss}>
                  Plus tard
                </Button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Fermer"
            className="rounded-full p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
