import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Check, X, Clock } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { useStore } from "@/lib/store";
import type { Post } from "@/lib/store";

export const Route = createFileRoute("/calendar")({
  component: CalendarPage,
  head: () => ({
    meta: [
      { title: "Calendrier — PostPilot" },
      { name: "description", content: "Ton calendrier éditorial" },
    ],
  }),
});

function CalendarPage() {
  const state = useStore();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  const dates = [...new Set(state.posts.map((p) => p.scheduledDate))].sort();
  const selectedPosts = state.posts
    .filter((p) => p.scheduledDate === selectedDate)
    .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

  const currentIdx = dates.indexOf(selectedDate);

  const goTo = (dir: -1 | 1) => {
    const newIdx = currentIdx + dir;
    if (newIdx >= 0 && newIdx < dates.length) {
      setSelectedDate(dates[newIdx]);
    }
  };

  const formatDate = (d: string) => {
    const date = new Date(d + "T00:00:00");
    const today = new Date().toISOString().slice(0, 10);
    if (d === today) return "Aujourd'hui";
    return date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  };

  const statusIcon = (post: Post) => {
    if (post.status === "published") return <Check className="w-3.5 h-3.5 text-success" />;
    if (post.status === "skipped") return <X className="w-3.5 h-3.5 text-destructive" />;
    return <Clock className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <h1 className="text-xl font-bold text-foreground mb-6">Calendrier</h1>

        {dates.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-sm">Aucun contenu planifié</p>
            <p className="text-xs mt-1">Importe ton contenu d'abord</p>
          </div>
        ) : (
          <>
            {/* Date Nav */}
            <div className="flex items-center justify-between bg-card rounded-2xl p-3 shadow-card border border-border mb-5">
              <button
                onClick={() => goTo(-1)}
                disabled={currentIdx <= 0}
                className="p-2 rounded-xl hover:bg-accent disabled:opacity-30 transition-all"
              >
                <ChevronLeft className="w-5 h-5 text-foreground" />
              </button>
              <span className="text-sm font-semibold text-foreground capitalize">
                {formatDate(selectedDate)}
              </span>
              <button
                onClick={() => goTo(1)}
                disabled={currentIdx >= dates.length - 1}
                className="p-2 rounded-xl hover:bg-accent disabled:opacity-30 transition-all"
              >
                <ChevronRight className="w-5 h-5 text-foreground" />
              </button>
            </div>

            {/* Date dots */}
            <div className="flex gap-1.5 overflow-x-auto pb-3 mb-4 scrollbar-none">
              {dates.map((d) => {
                const dayPosts = state.posts.filter((p) => p.scheduledDate === d);
                const allDone = dayPosts.every((p) => p.status !== "pending");
                const isToday = d === new Date().toISOString().slice(0, 10);
                return (
                  <button
                    key={d}
                    onClick={() => setSelectedDate(d)}
                    className={`flex flex-col items-center gap-0.5 min-w-[44px] rounded-xl py-2 px-1 transition-all ${
                      d === selectedDate
                        ? "gradient-primary text-primary-foreground"
                        : "bg-card border border-border"
                    }`}
                  >
                    <span className="text-[9px] font-medium uppercase">
                      {new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "short" })}
                    </span>
                    <span className="text-xs font-bold">
                      {new Date(d + "T00:00:00").getDate()}
                    </span>
                    {allDone && dayPosts.length > 0 && (
                      <div className="w-1.5 h-1.5 rounded-full bg-success" />
                    )}
                    {isToday && d !== selectedDate && (
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Posts list */}
            <div className="space-y-2">
              {selectedPosts.map((post) => (
                <div
                  key={post.id}
                  className="bg-card rounded-xl p-4 shadow-card border border-border animate-slide-up"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center">
                      {statusIcon(post)}
                    </div>
                    <span className="text-xs text-muted-foreground">{post.scheduledTime}</span>
                    <span className={`text-[10px] ml-auto font-medium ${
                      post.status === "published" ? "text-success" :
                      post.status === "skipped" ? "text-destructive" :
                      "text-muted-foreground"
                    }`}>
                      {post.status === "published" ? "Publié" : post.status === "skipped" ? "Ignoré" : "En attente"}
                    </span>
                  </div>
                  <p className="text-sm text-foreground line-clamp-3">{post.content}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
