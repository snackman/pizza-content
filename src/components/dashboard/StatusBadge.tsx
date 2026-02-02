'use client'

import { ContentStatus } from '@/types/database'

interface StatusBadgeProps {
  status: ContentStatus
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const statusConfig: Record<ContentStatus, { label: string; className: string }> = {
  pending: {
    label: 'Pending',
    className: 'bg-yellow-100 text-yellow-800',
  },
  approved: {
    label: 'Approved',
    className: 'bg-green-100 text-green-800',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-100 text-red-800',
  },
  featured: {
    label: 'Featured',
    className: 'bg-purple-100 text-purple-800',
  },
  flagged_not_pizza: {
    label: 'Not Pizza',
    className: 'bg-orange-100 text-orange-800',
  },
  flagged_broken: {
    label: 'Broken',
    className: 'bg-gray-100 text-gray-800',
  },
}

export function StatusBadge({
  status,
  size = 'md',
  className = '',
}: StatusBadgeProps) {
  const config = statusConfig[status]

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  }

  return (
    <span
      className={`
        inline-flex items-center
        ${sizeClasses[size]}
        ${config.className}
        rounded-full font-medium
        ${className}
      `}
    >
      {config.label}
    </span>
  )
}
