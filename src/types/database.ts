export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type ContentType = 'gif' | 'meme' | 'video' | 'music'
export type ContentStatus = 'pending' | 'approved' | 'rejected' | 'featured'
export type RequestStatus = 'open' | 'in_progress' | 'fulfilled' | 'closed'
export type ClaimStatus = 'active' | 'completed' | 'abandoned' | 'expired'
export type RequestPriority = 'low' | 'normal' | 'high' | 'urgent'
export type ImportLogStatus = 'running' | 'completed' | 'failed'

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
          business_name: string | null
          business_address: string | null
          city: string | null
          state: string | null
          country: string | null
          postal_code: string | null
          website_url: string | null
          phone: string | null
          is_verified: boolean
          verified_at: string | null
          bio: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username?: string | null
          display_name?: string | null
          avatar_url?: string | null
          is_pizzeria?: boolean
          business_name?: string | null
          business_address?: string | null
          city?: string | null
          state?: string | null
          country?: string | null
          postal_code?: string | null
          website_url?: string | null
          phone?: string | null
          is_verified?: boolean
          verified_at?: string | null
          bio?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          display_name?: string | null
          avatar_url?: string | null
          is_pizzeria?: boolean
          business_name?: string | null
          business_address?: string | null
          city?: string | null
          state?: string | null
          country?: string | null
          postal_code?: string | null
          website_url?: string | null
          phone?: string | null
          is_verified?: boolean
          verified_at?: string | null
          bio?: string | null
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
          // Music-specific fields
          duration_seconds: number | null
          artist: string | null
          album: string | null
          // Request fulfillment
          fulfills_request_id: string | null
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
          // Music-specific fields
          duration_seconds?: number | null
          artist?: string | null
          album?: string | null
          // Request fulfillment
          fulfills_request_id?: string | null
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
          // Music-specific fields
          duration_seconds?: number | null
          artist?: string | null
          album?: string | null
          // Request fulfillment
          fulfills_request_id?: string | null
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
          bounty_amount: number
          bounty_currency: string
          claimed_by: string | null
          claimed_at: string | null
          deadline: string | null
          is_featured: boolean
          priority: string
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
          bounty_amount?: number
          bounty_currency?: string
          claimed_by?: string | null
          claimed_at?: string | null
          deadline?: string | null
          is_featured?: boolean
          priority?: string
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
          bounty_amount?: number
          bounty_currency?: string
          claimed_by?: string | null
          claimed_at?: string | null
          deadline?: string | null
          is_featured?: boolean
          priority?: string
          created_at?: string
          updated_at?: string
        }
      }
      request_claims: {
        Row: {
          id: string
          request_id: string
          user_id: string
          claimed_at: string
          expires_at: string
          status: ClaimStatus
        }
        Insert: {
          id?: string
          request_id: string
          user_id: string
          claimed_at?: string
          expires_at?: string
          status?: ClaimStatus
        }
        Update: {
          id?: string
          request_id?: string
          user_id?: string
          claimed_at?: string
          expires_at?: string
          status?: ClaimStatus
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
      import_sources: {
        Row: {
          id: string
          platform: string
          source_identifier: string
          display_name: string | null
          last_fetched_at: string | null
          is_active: boolean
          config: Record<string, unknown>
          created_at: string
        }
        Insert: {
          id?: string
          platform: string
          source_identifier: string
          display_name?: string | null
          last_fetched_at?: string | null
          is_active?: boolean
          config?: Record<string, unknown>
          created_at?: string
        }
        Update: {
          id?: string
          platform?: string
          source_identifier?: string
          display_name?: string | null
          last_fetched_at?: string | null
          is_active?: boolean
          config?: Record<string, unknown>
          created_at?: string
        }
      }
      import_logs: {
        Row: {
          id: string
          source_id: string
          status: ImportLogStatus
          items_found: number
          items_imported: number
          items_skipped: number
          error_message: string | null
          started_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          source_id: string
          status: ImportLogStatus
          items_found?: number
          items_imported?: number
          items_skipped?: number
          error_message?: string | null
          started_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          source_id?: string
          status?: ImportLogStatus
          items_found?: number
          items_imported?: number
          items_skipped?: number
          error_message?: string | null
          started_at?: string
          completed_at?: string | null
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
      claim_status: ClaimStatus
    }
  }
}

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
