import { useSyncExternalStore } from "react";

export interface Post {
  id: string;
  content: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:mm
  status: "pending" | "published" | "skipped";
  reactions?: number;
  comments?: number;
  publishedAt?: string;
}

export interface AppState {
  posts: Post[];
  streak: number;
  longestStreak: number;
  totalPoints: number;
  level: number;
  lastActiveDate: string | null;
  postsPerDay: number;
}

const STORAGE_KEY = "postpilot-state";

const defaultState: AppState = {
  posts: [],
  streak: 0,
  longestStreak: 0,
  totalPoints: 0,
  level: 1,
  lastActiveDate: null,
  postsPerDay: 3,
};

function loadState(): AppState {
  try {
    if (typeof window === "undefined") return defaultState;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    return { ...defaultState, ...JSON.parse(raw) };
  } catch {
    return defaultState;
  }
}

let state: AppState = defaultState;
let listeners: Set<() => void> = new Set();

function emitChange() {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  listeners.forEach((l) => l());
}

function setState(partial: Partial<AppState>) {
  state = { ...state, ...partial };
  emitChange();
}

export function initStore() {
  state = loadState();
  checkStreak();
  emitChange();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function checkStreak() {
  if (!state.lastActiveDate) return;
  const last = new Date(state.lastActiveDate);
  const now = new Date(today());
  const diffDays = Math.floor((now.getTime() - last.getTime()) / 86400000);
  if (diffDays > 1) {
    setState({ streak: 0 });
  }
}

function incrementStreak() {
  const t = today();
  if (state.lastActiveDate === t) return;
  const newStreak = state.streak + 1;
  const newLongest = Math.max(newStreak, state.longestStreak);
  const newLevel = Math.floor(newStreak / 7) + 1;
  setState({
    streak: newStreak,
    longestStreak: newLongest,
    lastActiveDate: t,
    level: newLevel,
  });
}

export function parseContent(text: string, postsPerDay: number): Post[] {
  const blocks = text
    .split(/\n{2,}|\r\n{2,}/)
    .map((b) => b.trim())
    .filter((b) => b.length > 10);

  const posts: Post[] = [];
  const startDate = new Date();
  const times = ["09:00", "13:00", "18:00", "08:00", "11:00", "15:00", "17:00", "19:00", "20:00", "21:00"];

  blocks.forEach((content, i) => {
    const dayOffset = Math.floor(i / postsPerDay);
    const timeIndex = i % postsPerDay;
    const date = new Date(startDate);
    date.setDate(date.getDate() + dayOffset);

    posts.push({
      id: crypto.randomUUID(),
      content,
      scheduledDate: date.toISOString().slice(0, 10),
      scheduledTime: times[timeIndex] || times[0],
      status: "pending",
    });
  });

  return posts;
}

export function addPosts(newPosts: Post[]) {
  setState({ posts: [...state.posts, ...newPosts] });
}

export function publishPost(id: string) {
  const posts = state.posts.map((p) =>
    p.id === id
      ? { ...p, status: "published" as const, publishedAt: new Date().toISOString() }
      : p
  );
  const pts = state.totalPoints + 10;
  setState({ posts, totalPoints: pts });
  incrementStreak();
}

export function skipPost(id: string) {
  const posts = state.posts.map((p) =>
    p.id === id ? { ...p, status: "skipped" as const } : p
  );
  setState({ posts });
}

export function updatePostStats(id: string, reactions: number, comments: number) {
  const posts = state.posts.map((p) =>
    p.id === id ? { ...p, reactions, comments } : p
  );
  setState({ posts });
}

export function setPostsPerDay(n: number) {
  setState({ postsPerDay: n });
}

export function clearAllData() {
  state = defaultState;
  emitChange();
}

export function useStore(): AppState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => defaultState
  );
}

export function getTodayPosts(posts: Post[]): Post[] {
  const t = today();
  return posts.filter((p) => p.scheduledDate === t);
}

export function getNextPost(posts: Post[]): Post | null {
  const t = today();
  const todayPending = posts
    .filter((p) => p.scheduledDate === t && p.status === "pending")
    .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
  return todayPending[0] || null;
}

export function getWeeklyStats(posts: Post[]) {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const weekPosts = posts.filter((p) => {
    const d = new Date(p.scheduledDate);
    return d >= weekAgo && d <= now;
  });

  const published = weekPosts.filter((p) => p.status === "published");
  const totalReactions = published.reduce((s, p) => s + (p.reactions || 0), 0);
  const totalComments = published.reduce((s, p) => s + (p.comments || 0), 0);
  const bestPost = [...published].sort(
    (a, b) => (b.reactions || 0) + (b.comments || 0) - ((a.reactions || 0) + (a.comments || 0))
  )[0];

  const activeDays = new Set(published.map((p) => p.scheduledDate)).size;

  return { published: published.length, total: weekPosts.length, totalReactions, totalComments, bestPost, activeDays };
}

export function getLevelName(level: number): string {
  const names = ["Débutante", "Active", "Régulière", "Constante", "Machine à contenu", "Légende"];
  return names[Math.min(level - 1, names.length - 1)];
}

export function getRewardMessage(streak: number): string | null {
  if (streak === 7) return "🎉 7 jours ! Tu es régulière !";
  if (streak === 14) return "🏆 14 jours ! Tu es une machine !";
  if (streak === 30) return "👑 30 jours ! Tu es une légende !";
  return null;
}
