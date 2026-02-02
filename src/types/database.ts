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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      content: {
        Row: {
          album: string | null
          artist: string | null
          created_at: string | null
          description: string | null
          duration_seconds: number | null
          fulfills_request_id: string | null
          id: string
          is_viral: boolean | null
          source_platform: string | null
          source_url: string | null
          status: Database["public"]["Enums"]["content_status"] | null
          submitted_by: string | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          type: Database["public"]["Enums"]["content_type"]
          updated_at: string | null
          url: string
          view_count: number | null
        }
        Insert: {
          album?: string | null
          artist?: string | null
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          fulfills_request_id?: string | null
          id?: string
          is_viral?: boolean | null
          source_platform?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["content_status"] | null
          submitted_by?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          type: Database["public"]["Enums"]["content_type"]
          updated_at?: string | null
          url: string
          view_count?: number | null
        }
        Update: {
          album?: string | null
          artist?: string | null
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          fulfills_request_id?: string | null
          id?: string
          is_viral?: boolean | null
          source_platform?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["content_status"] | null
          submitted_by?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          type?: Database["public"]["Enums"]["content_type"]
          updated_at?: string | null
          url?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_fulfills_request_id_fkey"
            columns: ["fulfills_request_id"]
            isOneToOne: false
            referencedRelation: "content_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_requests: {
        Row: {
          bounty_amount: number | null
          bounty_currency: string | null
          claimed_at: string | null
          claimed_by: string | null
          created_at: string | null
          deadline: string | null
          description: string
          fulfilled_by: string | null
          id: string
          is_featured: boolean | null
          priority: string | null
          requested_by: string | null
          status: Database["public"]["Enums"]["request_status"] | null
          tags: string[] | null
          title: string
          type: Database["public"]["Enums"]["content_type"] | null
          updated_at: string | null
        }
        Insert: {
          bounty_amount?: number | null
          bounty_currency?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string | null
          deadline?: string | null
          description: string
          fulfilled_by?: string | null
          id?: string
          is_featured?: boolean | null
          priority?: string | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["request_status"] | null
          tags?: string[] | null
          title: string
          type?: Database["public"]["Enums"]["content_type"] | null
          updated_at?: string | null
        }
        Update: {
          bounty_amount?: number | null
          bounty_currency?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string | null
          deadline?: string | null
          description?: string
          fulfilled_by?: string | null
          id?: string
          is_featured?: boolean | null
          priority?: string | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["request_status"] | null
          tags?: string[] | null
          title?: string
          type?: Database["public"]["Enums"]["content_type"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_requests_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_requests_fulfilled_by_fkey"
            columns: ["fulfilled_by"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          content_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          content_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          content_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      import_logs: {
        Row: {
          completed_at: string | null
          error_message: string | null
          id: string
          items_found: number | null
          items_imported: number | null
          items_skipped: number | null
          source_id: string | null
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          items_found?: number | null
          items_imported?: number | null
          items_skipped?: number | null
          source_id?: string | null
          started_at?: string | null
          status: string
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          items_found?: number | null
          items_imported?: number | null
          items_skipped?: number | null
          source_id?: string | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_logs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "import_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      import_sources: {
        Row: {
          config: Json | null
          created_at: string | null
          display_name: string | null
          id: string
          is_active: boolean | null
          last_fetched_at: string | null
          platform: string
          source_identifier: string
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          is_active?: boolean | null
          last_fetched_at?: string | null
          platform: string
          source_identifier: string
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          is_active?: boolean | null
          last_fetched_at?: string | null
          platform?: string
          source_identifier?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          business_address: string | null
          business_name: string | null
          city: string | null
          country: string | null
          created_at: string | null
          display_name: string | null
          id: string
          is_pizzeria: boolean | null
          is_verified: boolean | null
          phone: string | null
          postal_code: string | null
          state: string | null
          updated_at: string | null
          username: string | null
          verified_at: string | null
          website_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          business_address?: string | null
          business_name?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          display_name?: string | null
          id: string
          is_pizzeria?: boolean | null
          is_verified?: boolean | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string | null
          username?: string | null
          verified_at?: string | null
          website_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          business_address?: string | null
          business_name?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          is_pizzeria?: boolean | null
          is_verified?: boolean | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string | null
          username?: string | null
          verified_at?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      request_claims: {
        Row: {
          claimed_at: string | null
          expires_at: string | null
          id: string
          request_id: string
          status: string
          user_id: string
        }
        Insert: {
          claimed_at?: string | null
          expires_at?: string | null
          id?: string
          request_id: string
          status?: string
          user_id: string
        }
        Update: {
          claimed_at?: string | null
          expires_at?: string | null
          id?: string
          request_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_claims_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "content_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_claims_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      view_history: {
        Row: {
          content_id: string
          id: string
          user_id: string
          viewed_at: string | null
        }
        Insert: {
          content_id: string
          id?: string
          user_id: string
          viewed_at?: string | null
        }
        Update: {
          content_id?: string
          id?: string
          user_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "view_history_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "view_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      content_status: "pending" | "approved" | "rejected" | "featured"
      content_type: "gif" | "meme" | "video" | "music" | "photo" | "art"
      request_status: "open" | "in_progress" | "fulfilled" | "closed"
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
      content_status: ["pending", "approved", "rejected", "featured"],
      content_type: ["gif", "meme", "video", "music", "photo", "art"],
      request_status: ["open", "in_progress", "fulfilled", "closed"],
    },
  },
} as const

// Type aliases for convenience
export type ContentType = Database['public']['Enums']['content_type']
export type ContentStatus = Database['public']['Enums']['content_status']
export type RequestStatus = Database['public']['Enums']['request_status']

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Content = Database['public']['Tables']['content']['Row']
export type ContentRequest = Database['public']['Tables']['content_requests']['Row']
export type RequestClaim = Database['public']['Tables']['request_claims']['Row']
export type Favorite = Database['public']['Tables']['favorites']['Row']
export type ViewHistory = Database['public']['Tables']['view_history']['Row']
export type ImportSource = Database['public']['Tables']['import_sources']['Row']
export type ImportLog = Database['public']['Tables']['import_logs']['Row']

// Extended types for joined queries
export interface ContentRequestWithProfile extends ContentRequest {
  requester?: Profile | null
  claimer?: Profile | null
}

export interface RequestClaimWithProfile extends RequestClaim {
  user?: Profile | null
}

// Submission form data type
export interface SubmissionFormData {
  type: ContentType
  title: string
  description?: string
  file?: File
  url?: string
  source_url?: string
  tags: string[]
}
