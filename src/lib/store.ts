import { supabase } from "@/integrations/supabase/client";

export interface Post {
  id: string;
  content: string;
  scheduledDate: string;
  scheduledTime: string;
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

// Convert DB row to Post
function rowToPost(row: any): Post {
  return {
    id: row.id,
    content: row.content,
    scheduledDate: row.scheduled_date,
    scheduledTime: row.scheduled_time?.slice(0, 5) || "09:00",
    status: row.status as Post["status"],
    reactions: row.reactions ?? undefined,
    comments: row.comments ?? undefined,
    publishedAt: row.published_at ?? undefined,
  };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

// ---- Data fetching ----

export async function fetchPosts(): Promise<Post[]> {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .order("scheduled_date", { ascending: true })
    .order("scheduled_time", { ascending: true });
  if (error) throw error;
  return (data || []).map(rowToPost);
}

export async function fetchUserStats(): Promise<Omit<AppState, "posts"> | null> {
  const { data, error } = await supabase
    .from("user_stats")
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    streak: data.streak,
    longestStreak: data.longest_streak,
    totalPoints: data.total_points,
    level: data.level,
    lastActiveDate: data.last_active_date,
    postsPerDay: data.posts_per_day,
  };
}

// ---- Mutations ----

export function parseContent(text: string, postsPerDay: number): Omit<Post, "id">[] {
  const blocks = text
    .split(/\n{2,}|\r\n{2,}/)
    .map((b) => b.trim())
    .filter((b) => b.length > 10);

  const posts: Omit<Post, "id">[] = [];
  const startDate = new Date();
  const times = ["09:00", "13:00", "18:00", "08:00", "11:00", "15:00", "17:00", "19:00", "20:00", "21:00"];

  blocks.forEach((content, i) => {
    const dayOffset = Math.floor(i / postsPerDay);
    const timeIndex = i % postsPerDay;
    const date = new Date(startDate);
    date.setDate(date.getDate() + dayOffset);

    posts.push({
      content,
      scheduledDate: date.toISOString().slice(0, 10),
      scheduledTime: times[timeIndex] || times[0],
      status: "pending",
    });
  });

  return posts;
}

export async function addPosts(userId: string, newPosts: Omit<Post, "id">[]) {
  const rows = newPosts.map((p) => ({
    user_id: userId,
    content: p.content,
    scheduled_date: p.scheduledDate,
    scheduled_time: p.scheduledTime,
    status: p.status,
  }));
  const { error } = await supabase.from("posts").insert(rows);
  if (error) throw error;
}

export async function publishPost(postId: string) {
  const { error: postError } = await supabase
    .from("posts")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", postId);
  if (postError) throw postError;

  // Update stats
  const stats = await fetchUserStats();
  if (!stats) return;

  const t = today();
  let newStreak = stats.streak;
  let newLongest = stats.longestStreak;
  let newLevel = stats.level;

  if (stats.lastActiveDate !== t) {
    // Check if streak should reset
    if (stats.lastActiveDate) {
      const last = new Date(stats.lastActiveDate);
      const now = new Date(t);
      const diffDays = Math.floor((now.getTime() - last.getTime()) / 86400000);
      if (diffDays > 1) newStreak = 0;
    }
    newStreak += 1;
    newLongest = Math.max(newStreak, newLongest);
    newLevel = Math.floor(newStreak / 7) + 1;
  }

  const { error: statsError } = await supabase
    .from("user_stats")
    .update({
      streak: newStreak,
      longest_streak: newLongest,
      total_points: stats.totalPoints + 10,
      level: newLevel,
      last_active_date: t,
    })
    .eq("user_id", (await supabase.auth.getUser()).data.user!.id);
  if (statsError) throw statsError;
}

export async function skipPost(postId: string) {
  const { error } = await supabase
    .from("posts")
    .update({ status: "skipped" })
    .eq("id", postId);
  if (error) throw error;
}

export async function updatePostStats(postId: string, reactions: number, comments: number) {
  const { error } = await supabase
    .from("posts")
    .update({ reactions, comments })
    .eq("id", postId);
  if (error) throw error;
}

export async function updatePostContent(postId: string, content: string) {
  const { error } = await supabase
    .from("posts")
    .update({ content })
    .eq("id", postId);
  if (error) throw error;
}

export async function deletePost(postId: string) {
  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId);
  if (error) throw error;
}

export async function setPostsPerDay(userId: string, n: number) {
  const { error } = await supabase
    .from("user_stats")
    .update({ posts_per_day: n })
    .eq("user_id", userId);
  if (error) throw error;
}

export async function clearAllData(userId: string) {
  await supabase.from("posts").delete().eq("user_id", userId);
  await supabase
    .from("user_stats")
    .update({ streak: 0, longest_streak: 0, total_points: 0, level: 1, last_active_date: null, posts_per_day: 3 })
    .eq("user_id", userId);
}

// ---- Helpers (pure functions, no DB) ----

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
