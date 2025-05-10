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
      shared_clipboard_items: {
        Row: {
          content: string
          content_type: string
          created_at: string
          created_by: string | null
          id: string
          library_id: string | null
          screenshot_url: string | null
          title: string
        }
        Insert: {
          content: string
          content_type: string
          created_at?: string
          created_by?: string | null
          id?: string
          library_id?: string | null
          screenshot_url?: string | null
          title: string
        }
        Update: {
          content?: string
          content_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          library_id?: string | null
          screenshot_url?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_clipboard_items_library_id_fkey"
            columns: ["library_id"]
            isOneToOne: false
            referencedRelation: "user_libraries"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_library_permissions: {
        Row: {
          can_delete: boolean
          can_edit: boolean
          created_at: string
          id: string
          library_id: string | null
          shared_by: string
          shared_with: string
        }
        Insert: {
          can_delete?: boolean
          can_edit?: boolean
          created_at?: string
          id?: string
          library_id?: string | null
          shared_by: string
          shared_with: string
        }
        Update: {
          can_delete?: boolean
          can_edit?: boolean
          created_at?: string
          id?: string
          library_id?: string | null
          shared_by?: string
          shared_with?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_library_permissions_library_id_fkey"
            columns: ["library_id"]
            isOneToOne: false
            referencedRelation: "user_libraries"
            referencedColumns: ["id"]
          },
        ]
      }
      user_libraries: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_shared: boolean | null
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_shared?: boolean | null
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_shared?: boolean | null
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_id_by_email: {
        Args: { email_input: string }
        Returns: string
      }
      has_clipboard_access: {
        Args: { item_creator_id: string; current_user_id: string }
        Returns: boolean
      }
      has_library_access: {
        Args: { library_id: string; current_user_id: string }
        Returns: boolean
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
