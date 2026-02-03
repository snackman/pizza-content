// Pizza All Stars types

export interface PizzaAllStar {
  id: string
  name: string
  slug: string
  description: string | null
  instagram_url: string | null
  youtube_url: string | null
  tiktok_url: string | null
  website_url: string | null
  image_url: string | null
  search_terms: string[] | null
  upvotes: number
  downvotes: number
  status: 'pending' | 'approved' | 'rejected'
  submitted_by: string | null
  created_at: string
}

export interface AllStarSubmission {
  name: string
  description?: string
  instagramUrl?: string
  youtubeUrl?: string
  tiktokUrl?: string
  websiteUrl?: string
}
