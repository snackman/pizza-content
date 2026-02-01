'use client'

import { useState } from 'react'

export interface ImportSource {
  id: string
  platform: string
  source_identifier: string
  display_name: string | null
  last_fetched_at: string | null
  is_active: boolean
  config: Record<string, unknown>
  created_at: string
}

interface ImportSourceCardProps {
  source: ImportSource
  onToggle?: (id: string, isActive: boolean) => void
  onImportNow?: (source: ImportSource) => void
}

// Platform icons/colors
const platformConfig: Record<string, { color: string; icon: string }> = {
  reddit: { color: 'bg-orange-500', icon: 'R' },
  giphy: { color: 'bg-purple-500', icon: 'G' },
  tenor: { color: 'bg-blue-500', icon: 'T' },
  youtube: { color: 'bg-red-500', icon: 'Y' },
  imgur: { color: 'bg-green-600', icon: 'I' },
  unsplash: { color: 'bg-gray-800', icon: 'U' },
  pexels: { color: 'bg-teal-500', icon: 'P' },
  pixabay: { color: 'bg-lime-500', icon: 'X' },
}

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return 'Never'

  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString()
}

export function ImportSourceCard({ source, onToggle, onImportNow }: ImportSourceCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isToggling, setIsToggling] = useState(false)

  const config = platformConfig[source.platform] || { color: 'bg-gray-500', icon: '?' }

  const handleToggle = async () => {
    if (!onToggle || isToggling) return
    setIsToggling(true)
    try {
      await onToggle(source.id, !source.is_active)
    } finally {
      setIsToggling(false)
    }
  }

  const handleImportNow = async () => {
    if (!onImportNow || isLoading) return
    setIsLoading(true)
    try {
      await onImportNow(source)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={`bg-white rounded-xl shadow-md p-4 border-l-4 ${source.is_active ? 'border-green-500' : 'border-gray-300'}`}>
      <div className="flex items-start gap-3">
        {/* Platform Icon */}
        <div className={`w-10 h-10 rounded-lg ${config.color} flex items-center justify-center text-white font-bold text-lg`}>
          {config.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 truncate">
              {source.display_name || `${source.platform}/${source.source_identifier}`}
            </h3>
            {source.is_active ? (
              <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                Active
              </span>
            ) : (
              <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 rounded-full">
                Inactive
              </span>
            )}
          </div>

          <p className="text-sm text-gray-500 mt-1">
            Platform: <span className="font-medium capitalize">{source.platform}</span>
          </p>

          <p className="text-sm text-gray-500">
            Last imported: <span className="font-medium">{formatRelativeTime(source.last_fetched_at)}</span>
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={handleToggle}
            disabled={isToggling}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              source.is_active
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            } disabled:opacity-50`}
          >
            {isToggling ? '...' : source.is_active ? 'Disable' : 'Enable'}
          </button>

          <button
            onClick={handleImportNow}
            disabled={isLoading || !source.is_active}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-orange-100 text-orange-700 hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Importing...' : 'Import Now'}
          </button>
        </div>
      </div>
    </div>
  )
}
