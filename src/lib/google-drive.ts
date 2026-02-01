import { google, drive_v3 } from 'googleapis'

// Google Drive client configuration
// Uses service account for server-side access

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly']

// Audio MIME types we support
const AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/mp4',
  'audio/m4a',
  'audio/aac',
]

/**
 * Initialize Google Drive client using service account credentials
 * Requires GOOGLE_SERVICE_ACCOUNT_JSON environment variable
 */
function getDriveClient(): drive_v3.Drive {
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON

  if (!serviceAccountJson) {
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT_JSON environment variable is not set. ' +
        'Please set it to the JSON content of your service account key file.'
    )
  }

  let credentials
  try {
    credentials = JSON.parse(serviceAccountJson)
  } catch {
    throw new Error(
      'Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON. Ensure it contains valid JSON.'
    )
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: SCOPES,
  })

  return google.drive({ version: 'v3', auth })
}

export interface AudioFileInfo {
  id: string
  name: string
  mimeType: string
  size: number
  artist: string | null
  title: string
  estimatedDuration: number
}

/**
 * List audio files in a Google Drive folder
 *
 * @param folderId - The Google Drive folder ID
 * @returns Array of audio file information
 */
export async function listAudioFiles(
  folderId: string
): Promise<AudioFileInfo[]> {
  const drive = getDriveClient()

  // Build query to find audio files in the folder
  const mimeTypeQuery = AUDIO_MIME_TYPES.map((m) => `mimeType='${m}'`).join(
    ' or '
  )
  const query = `'${folderId}' in parents and (${mimeTypeQuery}) and trashed=false`

  const audioFiles: AudioFileInfo[] = []
  let pageToken: string | undefined

  do {
    const response = await drive.files.list({
      q: query,
      fields: 'nextPageToken, files(id, name, mimeType, size)',
      pageSize: 100,
      pageToken,
    })

    const files = response.data.files || []

    for (const file of files) {
      if (!file.id || !file.name) continue

      const { artist, title } = parseFilename(file.name)
      const size = parseInt(file.size || '0', 10)

      audioFiles.push({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType || 'audio/mpeg',
        size,
        artist,
        title,
        estimatedDuration: estimateDuration(size, file.mimeType || 'audio/mpeg'),
      })
    }

    pageToken = response.data.nextPageToken || undefined
  } while (pageToken)

  return audioFiles
}

/**
 * Get a readable stream for a Google Drive file
 *
 * @param fileId - The Google Drive file ID
 * @returns Node.js readable stream
 */
export async function getFileStream(
  fileId: string
): Promise<NodeJS.ReadableStream> {
  const drive = getDriveClient()

  const response = await drive.files.get(
    {
      fileId,
      alt: 'media',
    },
    {
      responseType: 'stream',
    }
  )

  return response.data as NodeJS.ReadableStream
}

/**
 * Get file metadata from Google Drive
 *
 * @param fileId - The Google Drive file ID
 * @returns File metadata including name, mimeType, and size
 */
export async function getFileMetadata(fileId: string): Promise<{
  name: string
  mimeType: string
  size: number
}> {
  const drive = getDriveClient()

  const response = await drive.files.get({
    fileId,
    fields: 'name, mimeType, size',
  })

  return {
    name: response.data.name || 'unknown',
    mimeType: response.data.mimeType || 'audio/mpeg',
    size: parseInt(response.data.size || '0', 10),
  }
}

/**
 * Parse filename to extract artist and title
 *
 * Common patterns:
 * - "Artist - Title.mp3"
 * - "Title.mp3"
 * - "01. Artist - Title.mp3"
 * - "Artist_Title.mp3"
 */
export function parseFilename(filename: string): {
  artist: string | null
  title: string
} {
  // Remove extension
  const name = filename.replace(/\.[^.]+$/, '')

  // Remove leading track numbers (e.g., "01. ", "01 - ", "1. ")
  const withoutTrackNum = name.replace(/^\d+[\.\s\-]+/, '')

  // Try "Artist - Title" pattern (most common)
  const dashMatch = withoutTrackNum.match(/^(.+?)\s*-\s*(.+)$/)
  if (dashMatch) {
    return {
      artist: cleanString(dashMatch[1]),
      title: cleanString(dashMatch[2]),
    }
  }

  // Try "Artist_Title" pattern
  const underscoreMatch = withoutTrackNum.match(/^(.+?)_(.+)$/)
  if (underscoreMatch) {
    return {
      artist: cleanString(underscoreMatch[1]),
      title: cleanString(underscoreMatch[2]),
    }
  }

  // No pattern matched, use entire name as title
  return {
    artist: null,
    title: cleanString(withoutTrackNum),
  }
}

/**
 * Clean up a string by replacing underscores/hyphens with spaces
 * and removing extra whitespace
 */
function cleanString(str: string): string {
  return str
    .replace(/[_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Estimate audio duration based on file size and MIME type
 *
 * For MP3: assumes ~128kbps bitrate (~16KB per second)
 * For WAV: assumes ~176KB per second (CD quality 44.1kHz 16-bit stereo)
 * For others: assumes ~128kbps
 */
export function estimateDuration(sizeBytes: number, mimeType: string): number {
  const sizeKB = sizeBytes / 1024

  // WAV files are much larger per second of audio
  if (mimeType.includes('wav')) {
    return Math.round(sizeKB / 176)
  }

  // MP3 and other compressed formats: ~128kbps = ~16KB/s
  return Math.round(sizeKB / 16)
}
