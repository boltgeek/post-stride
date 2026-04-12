import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchPosts, fetchUserStats, type AppState } from "@/lib/store";

const defaultStats: Omit<AppState, "posts"> = {
  streak: 0,
  longestStreak: 0,
  totalPoints: 0,
  level: 1,
  lastActiveDate: null,
  postsPerDay: 3,
};

export function usePosts() {
  return useQuery({
    queryKey: ["posts"],
    queryFn: fetchPosts,
  });
}

export function useUserStats() {
  return useQuery({
    queryKey: ["user-stats"],
    queryFn: async () => {
      const stats = await fetchUserStats();
      return stats || defaultStats;
    },
  });
}

export function useAppData() {
  const postsQuery = usePosts();
  const statsQuery = useUserStats();

  const posts = postsQuery.data || [];
  const stats = statsQuery.data || defaultStats;

  return {
    posts,
    ...stats,
    loading: postsQuery.isLoading || statsQuery.isLoading,
    refetch: () => {
      postsQuery.refetch();
      statsQuery.refetch();
    },
  };
}

export function useInvalidateAppData() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["posts"] });
    queryClient.invalidateQueries({ queryKey: ["user-stats"] });
  };
}
