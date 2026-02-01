import { createClient } from '@/lib/supabase/client'
import { ContentType } from '@/types/database'

// File size limits in bytes
export const FILE_SIZE_LIMITS: Record<ContentType, number> = {
  gif: 10 * 1024 * 1024, // 10MB
  meme: 5 * 1024 * 1024, // 5MB (images)
  video: 50 * 1024 * 1024, // 50MB
  music: 20 * 1024 * 1024, // 20MB
}

// Allowed file extensions by type
export const ALLOWED_EXTENSIONS: Record<ContentType, string[]> = {
  gif: ['.gif'],
  meme: ['.jpg', '.jpeg', '.png', '.webp'],
  video: ['.mp4', '.webm'],
  music: ['.mp3', '.wav', '.ogg', '.m4a'],
}

// Allowed MIME types by content type
export const ALLOWED_MIME_TYPES: Record<ContentType, string[]> = {
  gif: ['image/gif'],
  meme: ['image/jpeg', 'image/png', 'image/webp'],
  video: ['video/mp4', 'video/webm'],
  music: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a'],
}

// External URL patterns
export const URL_PATTERNS = {
  youtube: /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/)|youtu\.be\/)/,
  tiktok: /^(https?:\/\/)?(www\.|vm\.)?tiktok\.com\//,
  instagram: /^(https?:\/\/)?(www\.)?instagram\.com\/(reel|p)\//,
  twitter: /^(https?:\/\/)?(www\.)?(twitter\.com|x\.com)\/\w+\/status\//,
  directMedia: /\.(gif|jpg|jpeg|png|webp|mp4|webm)(\?.*)?$/i,
}

export interface UploadResult {
  success: boolean
  url?: string
  error?: string
}

export interface UrlValidationResult {
  valid: boolean
  platform?: string
  error?: string
}

/**
 * Validates a file before upload
 */
export function validateFile(
  file: File,
  contentType: ContentType
): { valid: boolean; error?: string } {
  // Check file size
  const maxSize = FILE_SIZE_LIMITS[contentType]
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds ${Math.round(maxSize / (1024 * 1024))}MB limit`,
    }
  }

  // Check MIME type
  const allowedMimes = ALLOWED_MIME_TYPES[contentType]
  if (!allowedMimes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${allowedMimes.join(', ')}`,
    }
  }

  // Check file extension
  const allowedExts = ALLOWED_EXTENSIONS[contentType]
  const ext = '.' + file.name.split('.').pop()?.toLowerCase()
  if (!allowedExts.includes(ext)) {
    return {
      valid: false,
      error: `Invalid file extension. Allowed: ${allowedExts.join(', ')}`,
    }
  }

  return { valid: true }
}

/**
 * Uploads a file to Supabase Storage
 */
export async function uploadToStorage(
  file: File,
  contentType: ContentType
): Promise<UploadResult> {
  const supabase = createClient()

  // Validate first
  const validation = validateFile(file, contentType)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  // Generate unique filename
  const uuid = crypto.randomUUID()
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  const folder = contentType === 'meme' ? 'memes' : `${contentType}s`
  const path = `${folder}/${uuid}.${ext}`

  try {
    const { error: uploadError } = await supabase.storage
      .from('content')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return { success: false, error: uploadError.message }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('content')
      .getPublicUrl(path)

    return { success: true, url: urlData.publicUrl }
  } catch (error) {
    console.error('Upload error:', error)
    return { success: false, error: 'Upload failed. Please try again.' }
  }
}

/**
 * Validates an external URL
 */
export function validateUrl(url: string): UrlValidationResult {
  try {
    const parsed = new URL(url)

    // Must be http or https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'URL must use http or https' }
    }

    // Check against known platforms
    if (URL_PATTERNS.youtube.test(url)) {
      return { valid: true, platform: 'youtube' }
    }
    if (URL_PATTERNS.tiktok.test(url)) {
      return { valid: true, platform: 'tiktok' }
    }
    if (URL_PATTERNS.instagram.test(url)) {
      return { valid: true, platform: 'instagram' }
    }
    if (URL_PATTERNS.twitter.test(url)) {
      return { valid: true, platform: 'twitter' }
    }
    if (URL_PATTERNS.directMedia.test(url)) {
      return { valid: true, platform: 'direct' }
    }

    // Allow any https URL as fallback
    if (parsed.protocol === 'https:') {
      return { valid: true, platform: 'other' }
    }

    return { valid: false, error: 'Unsupported URL format' }
  } catch {
    return { valid: false, error: 'Invalid URL' }
  }
}

/**
 * Extracts YouTube video ID from URL
 */
export function getYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }

  return null
}

/**
 * Generates a YouTube thumbnail URL
 */
export function getYouTubeThumbnail(url: string): string | null {
  const videoId = getYouTubeId(url)
  if (!videoId) return null
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
}

/**
 * Detects the content type from a file
 */
export function detectContentType(file: File): ContentType | null {
  if (file.type === 'image/gif') return 'gif'
  if (['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'meme'
  if (['video/mp4', 'video/webm'].includes(file.type)) return 'video'
  if (['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a'].includes(file.type)) return 'music'
  return null
}

/**
 * Formats file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
