export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      challenge_bans: {
        Row: {
          banned_at: string
          banned_by: string
          challenge_id: string
          id: string
          user_id: string
        }
        Insert: {
          banned_at?: string
          banned_by: string
          challenge_id: string
          id?: string
          user_id: string
        }
        Update: {
          banned_at?: string
          banned_by?: string
          challenge_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      challenge_participants: {
        Row: {
          challenge_id: string
          email: string | null
          id: string
          joined_at: string
          prenom: string | null
          score: number
          suspendue_jusqu_au: string | null
          type_compte: string
          user_id: string | null
        }
        Insert: {
          challenge_id: string
          email?: string | null
          id?: string
          joined_at?: string
          prenom?: string | null
          score?: number
          suspendue_jusqu_au?: string | null
          type_compte?: string
          user_id?: string | null
        }
        Update: {
          challenge_id?: string
          email?: string | null
          id?: string
          joined_at?: string
          prenom?: string | null
          score?: number
          suspendue_jusqu_au?: string | null
          type_compte?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_penalties: {
        Row: {
          applied_at: string
          applied_by: string
          challenge_id: string
          id: string
          motif: string
          points_retires: number
          suspendue_jusqu_au: string | null
          user_id: string
        }
        Insert: {
          applied_at?: string
          applied_by: string
          challenge_id: string
          id?: string
          motif: string
          points_retires?: number
          suspendue_jusqu_au?: string | null
          user_id: string
        }
        Update: {
          applied_at?: string
          applied_by?: string
          challenge_id?: string
          id?: string
          motif?: string
          points_retires?: number
          suspendue_jusqu_au?: string | null
          user_id?: string
        }
        Relationships: []
      }
      challenge_pod_members: {
        Row: {
          challenge_id: string
          id: string
          joined_at: string
          pod_id: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          id?: string
          joined_at?: string
          pod_id: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          id?: string
          joined_at?: string
          pod_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_pod_members_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_pod_members_pod_id_fkey"
            columns: ["pod_id"]
            isOneToOne: false
            referencedRelation: "challenge_pods"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_pods: {
        Row: {
          challenge_id: string
          created_at: string
          id: string
          pod_number: number
        }
        Insert: {
          challenge_id: string
          created_at?: string
          id?: string
          pod_number: number
        }
        Update: {
          challenge_id?: string
          created_at?: string
          id?: string
          pod_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "challenge_pods_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          actif: boolean
          created_at: string
          created_by: string
          date_debut: string
          date_fin: string
          description: string | null
          id: string
          interactions_per_post: number
          message_bienvenue: string | null
          prive: boolean
          scoring_rules: Json
          slug: string
          titre: string
          type: string
        }
        Insert: {
          actif?: boolean
          created_at?: string
          created_by: string
          date_debut?: string
          date_fin: string
          description?: string | null
          id?: string
          interactions_per_post?: number
          message_bienvenue?: string | null
          prive?: boolean
          scoring_rules?: Json
          slug: string
          titre: string
          type?: string
        }
        Update: {
          actif?: boolean
          created_at?: string
          created_by?: string
          date_debut?: string
          date_fin?: string
          description?: string | null
          id?: string
          interactions_per_post?: number
          message_bienvenue?: string | null
          prive?: boolean
          scoring_rules?: Json
          slug?: string
          titre?: string
          type?: string
        }
        Relationships: []
      }
      community_assignments: {
        Row: {
          assignee_user_id: string
          assignment_date: string
          challenge_id: string
          community_post_id: string
          completed_at: string | null
          created_at: string
          id: string
          owner_user_id: string
          penalty_applied: boolean
          slot_time: string
        }
        Insert: {
          assignee_user_id: string
          assignment_date?: string
          challenge_id: string
          community_post_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          owner_user_id: string
          penalty_applied?: boolean
          slot_time: string
        }
        Update: {
          assignee_user_id?: string
          assignment_date?: string
          challenge_id?: string
          community_post_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          owner_user_id?: string
          penalty_applied?: boolean
          slot_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_assignments_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_assignments_community_post_id_fkey"
            columns: ["community_post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          challenge_id: string
          confirmed_at: string | null
          created_at: string
          facebook_url: string
          id: string
          post_date: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          confirmed_at?: string | null
          created_at?: string
          facebook_url: string
          id?: string
          post_date?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          confirmed_at?: string | null
          created_at?: string
          facebook_url?: string
          id?: string
          post_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      imported_documents: {
        Row: {
          created_at: string
          file_name: string
          id: string
          post_count: number
          summary: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          post_count?: number
          summary?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          post_count?: number
          summary?: string | null
          user_id?: string
        }
        Relationships: []
      }
      missions_catalog: {
        Row: {
          category: string
          created_at: string
          id: string
          text: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          text: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          text?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          comments: number | null
          content: string
          created_at: string
          document_id: string | null
          id: string
          published_at: string | null
          reactions: number | null
          scheduled_date: string
          scheduled_time: string
          status: string
          user_id: string
        }
        Insert: {
          comments?: number | null
          content: string
          created_at?: string
          document_id?: string | null
          id?: string
          published_at?: string | null
          reactions?: number | null
          scheduled_date: string
          scheduled_time?: string
          status?: string
          user_id: string
        }
        Update: {
          comments?: number | null
          content?: string
          created_at?: string
          document_id?: string | null
          id?: string
          published_at?: string | null
          reactions?: number | null
          scheduled_date?: string
          scheduled_time?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "imported_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          amount_fcfa: number
          created_at: string
          document_id: string | null
          id: string
          plan: string
          provider: string
          provider_payload: Json | null
          reference: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_fcfa: number
          created_at?: string
          document_id?: string | null
          id?: string
          plan: string
          provider?: string
          provider_payload?: Json | null
          reference: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_fcfa?: number
          created_at?: string
          document_id?: string | null
          id?: string
          plan?: string
          provider?: string
          provider_payload?: Json | null
          reference?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          awarded_at: string
          badge_type: string
          challenge_id: string
          id: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          badge_type: string
          challenge_id: string
          id?: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          badge_type?: string
          challenge_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_daily_missions: {
        Row: {
          category: string
          completed_at: string | null
          created_at: string
          id: string
          mission_date: string
          mission_id: string
          user_id: string
        }
        Insert: {
          category: string
          completed_at?: string | null
          created_at?: string
          id?: string
          mission_date: string
          mission_id: string
          user_id: string
        }
        Update: {
          category?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          mission_date?: string
          mission_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_daily_missions_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      user_stats: {
        Row: {
          ai_full_unlocked_at: string | null
          challenges_created_this_month: number
          copy_count: number
          created_at: string
          display_name: string | null
          id: string
          last_active_date: string | null
          last_ai_generation_at: string | null
          level: number
          longest_streak: number
          posts_per_day: number
          publish_count: number
          streak: number
          subscription_plan: string | null
          subscription_until: string | null
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_full_unlocked_at?: string | null
          challenges_created_this_month?: number
          copy_count?: number
          created_at?: string
          display_name?: string | null
          id?: string
          last_active_date?: string | null
          last_ai_generation_at?: string | null
          level?: number
          longest_streak?: number
          posts_per_day?: number
          publish_count?: number
          streak?: number
          subscription_plan?: string | null
          subscription_until?: string | null
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_full_unlocked_at?: string | null
          challenges_created_this_month?: number
          copy_count?: number
          created_at?: string
          display_name?: string | null
          id?: string
          last_active_date?: string | null
          last_ai_generation_at?: string | null
          level?: number
          longest_streak?: number
          posts_per_day?: number
          publish_count?: number
          streak?: number
          subscription_plan?: string | null
          subscription_until?: string | null
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_challenge_score: {
        Args: { _kind: string; _user_id: string }
        Returns: undefined
      }
      apply_challenge_penalty: {
        Args: {
          _challenge_id: string
          _motif: string
          _points: number
          _suspend_until: string
          _user_id: string
        }
        Returns: undefined
      }
      apply_community_penalties: { Args: never; Returns: number }
      assign_user_to_pod: {
        Args: { _challenge_id: string; _user_id: string }
        Returns: string
      }
      close_challenge_now: {
        Args: { _challenge_id: string }
        Returns: undefined
      }
      close_expired_challenges: { Args: never; Returns: number }
      confirm_community_post: { Args: { _post_id: string }; Returns: undefined }
      delete_challenge_cascade: {
        Args: { _challenge_id: string }
        Returns: undefined
      }
      get_display_names: {
        Args: { _user_ids: string[] }
        Returns: {
          display_name: string
          user_id: string
        }[]
      }
      get_leaderboard: {
        Args: never
        Returns: {
          copy_count: number
          display_name: string
          is_current_user: boolean
          publish_count: number
          rank: number
          total_score: number
          user_id: string
        }[]
      }
      get_leaderboard_period: {
        Args: { _limit?: number; _offset?: number; _period?: string }
        Returns: {
          copy_count: number
          display_name: string
          is_current_user: boolean
          publish_count: number
          rank: number
          total_score: number
          user_id: string
        }[]
      }
      get_mission_history_stats: {
        Args: never
        Returns: {
          daily_counts: Json
          full_days: number
          total_completed: number
          week_consistency: number
        }[]
      }
      get_my_community_assignments_today: {
        Args: { _challenge_id: string }
        Returns: {
          completed_at: string
          facebook_url: string
          id: string
          owner_name: string
          owner_user_id: string
          slot_time: string
        }[]
      }
      get_my_community_post_today: {
        Args: { _challenge_id: string }
        Returns: {
          assignments: Json
          confirmed_at: string
          done: number
          facebook_url: string
          post_id: string
          total: number
        }[]
      }
      get_or_create_daily_missions: {
        Args: never
        Returns: {
          category: string
          completed_at: string
          id: string
          mission_id: string
          text: string
        }[]
      }
      increment_copy_count: { Args: never; Returns: undefined }
      mark_assignment_done: {
        Args: { _assignment_id: string }
        Returns: undefined
      }
      register_daily_login: { Args: never; Returns: undefined }
      remove_challenge_participant: {
        Args: { _challenge_id: string; _user_id: string }
        Returns: undefined
      }
      reset_monthly_challenge_counter: { Args: never; Returns: undefined }
      submit_community_post: {
        Args: { _challenge_id: string; _url: string }
        Returns: string
      }
      toggle_daily_mission: {
        Args: { _completed: boolean; _id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
