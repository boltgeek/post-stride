import { Bell, BellOff, BellRing } from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";
import { toast } from "sonner";

export function NotificationToggle() {
  const { permission, enabled, enable, disable } = useNotifications();

  if (permission === "unsupported") return null;

  const handleClick = async () => {
    if (enabled) {
      disable();
      toast.success("Notifications désactivées");
      return;
    }
    if (permission === "denied") {
      toast.error("Notifications bloquées dans ton navigateur. Active-les dans les réglages du site.");
      return;
    }
    const ok = await enable();
    if (!ok && permission !== "granted") {
      toast.error("Permission refusée");
    }
  };

  return (
    <button
      onClick={handleClick}
      className="w-full bg-card rounded-2xl p-4 shadow-card border border-border hover:shadow-card-hover transition-shadow flex items-center justify-between mb-4 animate-slide-up"
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${enabled ? "gradient-primary" : "bg-accent"}`}>
          {enabled ? (
            <BellRing className="w-5 h-5 text-primary-foreground" />
          ) : permission === "denied" ? (
            <BellOff className="w-5 h-5 text-muted-foreground" />
          ) : (
            <Bell className="w-5 h-5 text-primary" />
          )}
        </div>
        <div className="text-left">
          <p className="text-sm font-semibold text-foreground">
            {enabled ? "Rappels activés 🔥" : "Active les rappels"}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {enabled
              ? "Tu recevras une notif à chaque heure de publication"
              : "Ne rate plus jamais une publication"}
          </p>
        </div>
      </div>
      <div className={`text-xs font-semibold ${enabled ? "text-primary" : "text-muted-foreground"}`}>
        {enabled ? "ON" : "OFF"}
      </div>
    </button>
  );
}
