import { Link, useLocation } from "@tanstack/react-router";
import { Home, Calendar, BarChart3, MessageCircle } from "lucide-react";

const navItems = [
  { to: "/", icon: Home, label: "Accueil" },
  { to: "/calendar", icon: Calendar, label: "Calendrier" },
  { to: "/analytics", icon: BarChart3, label: "Classement" },
  { to: "/coach", icon: MessageCircle, label: "Coach" },
] as const;

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-card">
      <div className="max-w-lg mx-auto flex items-center justify-around py-2 px-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
                isActive
                  ? "text-primary scale-105"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5px]" : ""}`} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
