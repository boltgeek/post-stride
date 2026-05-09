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
      challenges: {
        Row: {
          actif: boolean
          created_at: string
          created_by: string
          date_debut: string
          date_fin: string
          description: string | null
          id: string
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
          message_bienvenue?: string | null
          prive?: boolean
          scoring_rules?: Json
          slug?: string
          titre?: string
          type?: string
        }
        Relationships: []
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
      user_stats: {
        Row: {
          challenges_created_this_month: number
          copy_count: number
          created_at: string
          display_name: string | null
          id: string
          last_active_date: string | null
          level: number
          longest_streak: number
          posts_per_day: number
          publish_count: number
          streak: number
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          challenges_created_this_month?: number
          copy_count?: number
          created_at?: string
          display_name?: string | null
          id?: string
          last_active_date?: string | null
          level?: number
          longest_streak?: number
          posts_per_day?: number
          publish_count?: number
          streak?: number
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          challenges_created_this_month?: number
          copy_count?: number
          created_at?: string
          display_name?: string | null
          id?: string
          last_active_date?: string | null
          level?: number
          longest_streak?: number
          posts_per_day?: number
          publish_count?: number
          streak?: number
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
      close_challenge_now: {
        Args: { _challenge_id: string }
        Returns: undefined
      }
      close_expired_challenges: { Args: never; Returns: number }
      delete_challenge_cascade: {
        Args: { _challenge_id: string }
        Returns: undefined
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
      increment_copy_count: { Args: never; Returns: undefined }
      register_daily_login: { Args: never; Returns: undefined }
      remove_challenge_participant: {
        Args: { _challenge_id: string; _user_id: string }
        Returns: undefined
      }
      reset_monthly_challenge_counter: { Args: never; Returns: undefined }
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
