export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type ContentType = 'gif' | 'meme' | 'video'
export type ContentStatus = 'pending' | 'approved' | 'rejected' | 'featured'
export type RequestStatus = 'open' | 'in_progress' | 'fulfilled' | 'closed'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          display_name: string | null
          avatar_url: string | null
          is_pizzeria: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username?: string | null
          display_name?: string | null
          avatar_url?: string | null
          is_pizzeria?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          display_name?: string | null
          avatar_url?: string | null
          is_pizzeria?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      content: {
        Row: {
          id: string
          type: ContentType
          title: string
          description: string | null
          url: string
          thumbnail_url: string | null
          source_url: string | null
          source_platform: string | null
          tags: string[]
          status: ContentStatus
          is_viral: boolean
          view_count: number
          submitted_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          type: ContentType
          title: string
          description?: string | null
          url: string
          thumbnail_url?: string | null
          source_url?: string | null
          source_platform?: string | null
          tags?: string[]
          status?: ContentStatus
          is_viral?: boolean
          view_count?: number
          submitted_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          type?: ContentType
          title?: string
          description?: string | null
          url?: string
          thumbnail_url?: string | null
          source_url?: string | null
          source_platform?: string | null
          tags?: string[]
          status?: ContentStatus
          is_viral?: boolean
          view_count?: number
          submitted_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      content_requests: {
        Row: {
          id: string
          title: string
          description: string
          type: ContentType | null
          tags: string[]
          status: RequestStatus
          requested_by: string | null
          fulfilled_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          type?: ContentType | null
          tags?: string[]
          status?: RequestStatus
          requested_by?: string | null
          fulfilled_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          type?: ContentType | null
          tags?: string[]
          status?: RequestStatus
          requested_by?: string | null
          fulfilled_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      favorites: {
        Row: {
          id: string
          user_id: string
          content_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content_id?: string
          created_at?: string
        }
      }
      view_history: {
        Row: {
          id: string
          user_id: string
          content_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content_id?: string
          viewed_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      content_type: ContentType
      content_status: ContentStatus
      request_status: RequestStatus
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Content = Database['public']['Tables']['content']['Row']
export type ContentRequest = Database['public']['Tables']['content_requests']['Row']
export type Favorite = Database['public']['Tables']['favorites']['Row']
export type ViewHistory = Database['public']['Tables']['view_history']['Row']
