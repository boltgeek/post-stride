import { Flame } from "lucide-react";

interface StreakBadgeProps {
  streak: number;
  level: number;
  levelName: string;
}

export function StreakBadge({ streak, level, levelName }: StreakBadgeProps) {
  return (
    <div className="flex items-center gap-3">
      <div className={`relative flex items-center justify-center w-12 h-12 rounded-full gradient-streak ${streak > 0 ? "animate-streak-fire" : ""}`}>
        <Flame className="w-6 h-6 text-streak-foreground" />
        <span className="absolute -bottom-1 -right-1 bg-card text-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center border border-border shadow-sm">
          {streak}
        </span>
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">
          {streak > 0 ? `${streak} jour${streak > 1 ? "s" : ""} d'affilée` : "Commence ton streak !"}
        </p>
        <p className="text-xs text-muted-foreground">
          Niv. {level} · {levelName}
        </p>
      </div>
    </div>
  );
}
