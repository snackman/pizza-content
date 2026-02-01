'use client'

import Link from 'next/link'
import { ContentRequest, Profile } from '@/types/database'
import { BountyBadge } from './BountyBadge'
import { StatusBadge } from './StatusBadge'

interface RequestCardProps {
  request: ContentRequest & { requester?: Profile | null }
  showRequester?: boolean
}

const typeLabels: Record<string, string> = {
  gif: 'GIF',
  meme: 'Meme',
  video: 'Video',
  music: 'Music',
}

export function RequestCard({ request, showRequester = true }: RequestCardProps) {
  const deadline = request.deadline ? new Date(request.deadline) : null
  const isExpired = deadline && deadline < new Date()
  const daysUntilDeadline = deadline
    ? Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <Link href={`/requests/${request.id}`}>
      <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all border border-gray-100 h-full flex flex-col">
        {/* Header with badges */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
          <StatusBadge status={request.status} size="sm" />
          <BountyBadge amount={request.bounty_amount} size="sm" />
        </div>

        {/* Content */}
        <div className="p-4 flex-1 flex flex-col">
          <h3 className="font-semibold text-gray-900 text-lg line-clamp-2 mb-2">
            {request.title}
          </h3>
          <p className="text-gray-600 text-sm line-clamp-3 flex-1">
            {request.description}
          </p>

          {/* Type and Tags */}
          <div className="flex flex-wrap gap-2 mt-3">
            {request.type && (
              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full font-medium">
                {typeLabels[request.type] || request.type}
              </span>
            )}
            {request.tags?.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
              >
                {tag}
              </span>
            ))}
            {request.tags && request.tags.length > 2 && (
              <span className="px-2 py-0.5 text-gray-400 text-xs">
                +{request.tags.length - 2}
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          {showRequester && request.requester && (
            <span className="flex items-center gap-1">
              <span className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-xs font-medium">
                {request.requester.display_name?.[0]?.toUpperCase() || '?'}
              </span>
              <span className="truncate max-w-[100px]">
                {request.requester.display_name || 'Anonymous'}
              </span>
            </span>
          )}

          {deadline && (
            <span
              className={`flex items-center gap-1 ${
                isExpired
                  ? 'text-red-500'
                  : daysUntilDeadline !== null && daysUntilDeadline <= 3
                  ? 'text-orange-500'
                  : 'text-gray-500'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {isExpired
                ? 'Expired'
                : daysUntilDeadline === 0
                ? 'Today'
                : daysUntilDeadline === 1
                ? '1 day left'
                : `${daysUntilDeadline} days left`}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
