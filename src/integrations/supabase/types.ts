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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      articles: {
        Row: {
          author_id: string
          body: string
          category: string
          created_at: string
          id: string
          image_url: string | null
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          category: string
          created_at?: string
          id?: string
          image_url?: string | null
          summary?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          category?: string
          created_at?: string
          id?: string
          image_url?: string | null
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          image_url: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          image_url?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          image_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          body: string
          created_at: string
          debate_id: string
          id: string
          image_url: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          debate_id: string
          id?: string
          image_url?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          debate_id?: string
          id?: string
          image_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_debate_id_fkey"
            columns: ["debate_id"]
            isOneToOne: false
            referencedRelation: "debate_stats"
            referencedColumns: ["debate_id"]
          },
          {
            foreignKeyName: "comments_debate_id_fkey"
            columns: ["debate_id"]
            isOneToOne: false
            referencedRelation: "debates"
            referencedColumns: ["id"]
          },
        ]
      }
      debates: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string
          featured: boolean
          id: string
          option_a: string
          option_b: string
          title: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          description?: string
          featured?: boolean
          id?: string
          option_a?: string
          option_b?: string
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          featured?: boolean
          id?: string
          option_a?: string
          option_b?: string
          title?: string
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          image_url: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          image_url?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          image_url?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          ban_reason: string | null
          banned_at: string | null
          bio: string
          created_at: string
          id: string
          username: string
          username_lower: string
        }
        Insert: {
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          bio?: string
          created_at?: string
          id: string
          username: string
          username_lower: string
        }
        Update: {
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          bio?: string
          created_at?: string
          id?: string
          username?: string
          username_lower?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          handled_by: string | null
          id: string
          reason: string
          reporter_id: string
          status: string
          target_id: string
          target_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          handled_by?: string | null
          id?: string
          reason?: string
          reporter_id: string
          status?: string
          target_id: string
          target_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          handled_by?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          status?: string
          target_id?: string
          target_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      staff_audit_log: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          details: Json
          id: string
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          details?: Json
          id?: string
          target_id?: string | null
          target_type?: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          details?: Json
          id?: string
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      user_ip_log: {
        Row: {
          created_at: string
          id: string
          ip_address: string
          last_seen: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address: string
          last_seen?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string
          last_seen?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      votes: {
        Row: {
          choice: string
          created_at: string
          debate_id: string
          id: string
          user_id: string
        }
        Insert: {
          choice: string
          created_at?: string
          debate_id: string
          id?: string
          user_id: string
        }
        Update: {
          choice?: string
          created_at?: string
          debate_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_debate_id_fkey"
            columns: ["debate_id"]
            isOneToOne: false
            referencedRelation: "debate_stats"
            referencedColumns: ["debate_id"]
          },
          {
            foreignKeyName: "votes_debate_id_fkey"
            columns: ["debate_id"]
            isOneToOne: false
            referencedRelation: "debates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      debate_stats: {
        Row: {
          comment_count: number | null
          debate_id: string | null
          total_votes: number | null
          votes_a: number | null
          votes_b: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_banned: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "vice_admin" | "admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["vice_admin", "admin", "moderator", "user"],
    },
  },
} as const
