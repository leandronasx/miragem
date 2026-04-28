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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admin_config: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      phone_verifications: {
        Row: {
          attempt_count: number
          created_at: string
          expires_at: string
          id: string
          otp_hash: string
          phone: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          expires_at: string
          id?: string
          otp_hash: string
          phone: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          expires_at?: string
          id?: string
          otp_hash?: string
          phone?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          balance_centavos?: number | null
          created_at: string | null
          diamonds: number
          display_name: string | null
          email: string
          id: string
          is_admin?: boolean | null
          is_banned?: boolean | null
          nome: string | null
          signup_ip: string | null
        }
        Insert: {
          balance_centavos?: number | null
          created_at?: string | null
          diamonds?: number
          display_name?: string | null
          email: string
          id?: string
          is_admin?: boolean | null
          is_banned?: boolean | null
          nome?: string | null
          signup_ip?: string | null
        }
        Update: {
          balance_centavos?: number | null
          created_at?: string | null
          diamonds?: number
          display_name?: string | null
          email?: string
          id?: string
          is_admin?: boolean | null
          is_banned?: boolean | null
          nome?: string | null
          signup_ip?: string | null
        }
        Relationships: []
      }
      support_sessions: {
        Row: {
          assigned_to?: string | null
          closed_at?: string | null
          created_at: string
          id: string
          model_id?: string | null
          status: string | null
          user_email?: string | null
          user_id?: string | null
          video_url?: string | null
        }
        Insert: {
          assigned_to?: string | null
          closed_at?: string | null
          created_at?: string
          id?: string
          model_id?: string | null
          status?: string | null
          user_email?: string | null
          user_id?: string | null
          video_url?: string | null
        }
        Update: {
          assigned_to?: string | null
          closed_at?: string | null
          created_at?: string
          id?: string
          model_id?: string | null
          status?: string | null
          user_email?: string | null
          user_id?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      videos: {
        Row: {
          id: string
          prompt: string | null
          thumbnail_url?: string | null
          title: string
          video_url: string
        }
        Insert: {
          id?: string
          prompt?: string | null
          thumbnail_url?: string | null
          title: string
          video_url: string
        }
        Update: {
          id?: string
          prompt?: string | null
          thumbnail_url?: string | null
          title?: string
          video_url?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          order_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          order_id: string
          sender_id?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          order_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      diamond_transactions: {
        Row: {
          amount?: number | null
          pack_id?: string | null
          created_at: string
          created_by: string | null
          delta: number
          id: string
          payment_ref: string | null
          product_id?: string | null
          status?: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          pack_id?: string | null
          created_at?: string
          created_by?: string | null
          delta: number
          id?: string
          payment_ref?: string | null
          product_id?: string | null
          status?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number | null
          pack_id?: string | null
          created_at?: string
          created_by?: string | null
          delta?: number
          id?: string
          payment_ref?: string | null
          product_id?: string | null
          status?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      login_events: {
        Row: {
          created_at: string
          email: string
          id: string
          ip: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          image_url?: string | null
          is_admin?: boolean | null
          sender: string
          session_id?: string | null
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_admin?: boolean | null
          sender: string
          session_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_admin?: boolean | null
          sender?: string
          session_id?: string | null
        }
        Relationships: []
      }
      video_likes: {
        Row: {
          created_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          created_at: string
          date: string | null
          id: string
          item_id: string | null
          method: string | null
          plan_id: string | null
          plan_name: string | null
          user_id: string
          video_id: string | null
        }
        Insert: {
          created_at?: string
          date?: string | null
          id?: string
          item_id?: string | null
          method?: string | null
          plan_id?: string | null
          plan_name?: string | null
          user_id: string
          video_id?: string | null
        }
        Update: {
          created_at?: string
          date?: string | null
          id?: string
          item_id?: string | null
          method?: string | null
          plan_id?: string | null
          plan_name?: string | null
          user_id?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_cards: {
        Row: {
          base: string
          created_at: string | null
          id: string
          src: string
          tags: Json | null
          title: string | null
          type: string
          user_id: string
        }
        Insert: {
          base: string
          created_at?: string | null
          id?: string
          src: string
          tags?: Json | null
          title?: string | null
          type: string
          user_id: string
        }
        Update: {
          base?: string
          created_at?: string | null
          id?: string
          src?: string
          tags?: Json | null
          title?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_current_support: {
        Row: {
          content: string
          id: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: string
          id?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: string
          id?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_admin_password: { Args: { pwd: string }; Returns: boolean }
      add_diamonds_to_user: {
        Args: { p_user_id: string; p_diamonds: number; p_payment_ref: string }
        Returns: number
      }
      credit_diamonds_purchase: {
        Args: { p_user_id: string; p_diamonds: number; p_payment_ref: string }
        Returns: number
      }
      credit_diamonds_purchase_v2: {
        Args: {
          p_user_id: string
          p_diamonds: number
          p_payment_ref: string
          p_amount: number | null
          p_product_id: string | null
          p_status: string | null
        }
        Returns: number
      }
      credit_diamonds_by_email: {
        Args: { p_amount: number; p_email: string }
        Returns: Json
      }
      debit_diamonds: {
        Args: { amount?: number; amount_to_debit?: number }
        Returns: number
      }
      get_user_balance: {
        Args: { user_id_param: string }
        Returns: number
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
