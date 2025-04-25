export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      accounts: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          created_at: string | null
          end_date: string
          entry_type: string
          has_subentries: boolean | null
          id: string
          plan: string | null
          review: string | null
          start_date: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          end_date: string
          entry_type: string
          has_subentries?: boolean | null
          id?: string
          plan?: string | null
          review?: string | null
          start_date: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string
          entry_type?: string
          has_subentries?: boolean | null
          id?: string
          plan?: string | null
          review?: string | null
          start_date?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_subentries: {
        Row: {
          created_at: string | null
          day_of_week: string
          id: string
          parent_id: string
          plan: string | null
          review: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          day_of_week: string
          id?: string
          parent_id: string
          plan?: string | null
          review?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          day_of_week?: string
          id?: string
          parent_id?: string
          plan?: string | null
          review?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_subentries_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      media_files: {
        Row: {
          created_at: string | null
          file_name: string
          file_path: string
          file_type: string
          id: string
          trade_id: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_path: string
          file_type: string
          id?: string
          trade_id?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_type?: string
          id?: string
          trade_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_files_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      setup_media: {
        Row: {
          created_at: string | null
          file_name: string
          file_path: string
          file_type: string
          id: string
          setup_id: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_path: string
          file_type: string
          id?: string
          setup_id: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_type?: string
          id?: string
          setup_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "setup_media_setup_id_fkey"
            columns: ["setup_id"]
            isOneToOne: false
            referencedRelation: "setups"
            referencedColumns: ["id"]
          },
        ]
      }
      setups: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          tags: string[] | null
          title: string
          trade_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          tags?: string[] | null
          title: string
          trade_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          tags?: string[] | null
          title?: string
          trade_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "setups_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      strategies: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "strategies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      symbols: {
        Row: {
          contract_size: number | null
          created_at: string | null
          id: string
          name: string
          symbol: string
          tick_size: number | null
          tick_value: number | null
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          contract_size?: number | null
          created_at?: string | null
          id?: string
          name: string
          symbol: string
          tick_size?: number | null
          tick_value?: number | null
          type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          contract_size?: number | null
          created_at?: string | null
          id?: string
          name?: string
          symbol?: string
          tick_size?: number | null
          tick_value?: number | null
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "symbols_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_closures: {
        Row: {
          close_date: string
          close_price: number
          close_time: string
          closed_position_size: number
          created_at: string | null
          id: string
          notes: string | null
          r_multiple: number | null
          trade_id: string
          updated_at: string | null
        }
        Insert: {
          close_date: string
          close_price: number
          close_time: string
          closed_position_size: number
          created_at?: string | null
          id?: string
          notes?: string | null
          r_multiple?: number | null
          trade_id: string
          updated_at?: string | null
        }
        Update: {
          close_date?: string
          close_price?: number
          close_time?: string
          closed_position_size?: number
          created_at?: string | null
          id?: string
          notes?: string | null
          r_multiple?: number | null
          trade_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trade_closures_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_idea_media: {
        Row: {
          created_at: string | null
          description: string | null
          file_name: string | null
          file_path: string
          file_type: string
          id: string
          trade_idea_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          file_name?: string | null
          file_path: string
          file_type: string
          id: string
          trade_idea_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          file_name?: string | null
          file_path?: string
          file_type?: string
          id?: string
          trade_idea_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trade_idea_media_trade_idea_id_fkey"
            columns: ["trade_idea_id"]
            isOneToOne: false
            referencedRelation: "trade_ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_ideas: {
        Row: {
          created_at: string | null
          date: string
          description: string | null
          id: string
          r_multiple: number | null
          title: string
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          description?: string | null
          id: string
          r_multiple?: number | null
          title: string
          type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          r_multiple?: number | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      trade_setups: {
        Row: {
          created_at: string | null
          id: string
          setup_id: string
          trade_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          setup_id: string
          trade_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          setup_id?: string
          trade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_setups_setup_id_fkey"
            columns: ["setup_id"]
            isOneToOne: false
            referencedRelation: "setups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_setups_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          account_id: string | null
          account_name: string | null
          created_at: string | null
          current_stop_loss: number | null
          date: string
          direction: string
          entry_price: number
          exit_price: number | null
          highest_price: number | null
          id: string
          initial_stop_loss: number | null
          lowest_price: number | null
          market_type: string
          max_risk_per_trade: number | null
          notes: string | null
          position_size: number
          position_size_closed: number | null
          psp_time: string | null
          remaining_size: number | null
          reward_amount: number | null
          reward_formula: string | null
          risk_amount: number | null
          risk_formula: string | null
          risk_reward_ratio: string | null
          setup_ids: string[]
          ssmt_quarter: string | null
          status: string | null
          strategy_id: string | null
          strategy_name: string | null
          symbol: string
          take_profit: number | null
          time: string
          timeframe: string | null
          trade_grade: string | null
          trade_type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          account_name?: string | null
          created_at?: string | null
          current_stop_loss?: number | null
          date: string
          direction: string
          entry_price: number
          exit_price?: number | null
          highest_price?: number | null
          id?: string
          initial_stop_loss?: number | null
          lowest_price?: number | null
          market_type: string
          max_risk_per_trade?: number | null
          notes?: string | null
          position_size: number
          position_size_closed?: number | null
          psp_time?: string | null
          remaining_size?: number | null
          reward_amount?: number | null
          reward_formula?: string | null
          risk_amount?: number | null
          risk_formula?: string | null
          risk_reward_ratio?: string | null
          setup_ids?: string[]
          ssmt_quarter?: string | null
          status?: string | null
          strategy_id?: string | null
          strategy_name?: string | null
          symbol: string
          take_profit?: number | null
          time: string
          timeframe?: string | null
          trade_grade?: string | null
          trade_type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          account_name?: string | null
          created_at?: string | null
          current_stop_loss?: number | null
          date?: string
          direction?: string
          entry_price?: number
          exit_price?: number | null
          highest_price?: number | null
          id?: string
          initial_stop_loss?: number | null
          lowest_price?: number | null
          market_type?: string
          max_risk_per_trade?: number | null
          notes?: string | null
          position_size?: number
          position_size_closed?: number | null
          psp_time?: string | null
          remaining_size?: number | null
          reward_amount?: number | null
          reward_formula?: string | null
          risk_amount?: number | null
          risk_formula?: string | null
          risk_reward_ratio?: string | null
          setup_ids?: string[]
          ssmt_quarter?: string | null
          status?: string | null
          strategy_id?: string | null
          strategy_name?: string | null
          symbol?: string
          take_profit?: number | null
          time?: string
          timeframe?: string | null
          trade_grade?: string | null
          trade_type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trades_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          email: string | null
          id: string
        }
        Insert: {
          email?: string | null
          id: string
        }
        Update: {
          email?: string | null
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
