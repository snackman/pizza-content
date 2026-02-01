'use client'

import { RequestStatus } from '@/types/database'

interface StatusBadgeProps {
  status: RequestStatus
  size?: 'sm' | 'md' | 'lg'
}

const statusConfig: Record<RequestStatus, { label: string; className: string }> = {
  open: {
    label: 'Open',
    className: 'bg-blue-100 text-blue-700',
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-yellow-100 text-yellow-700',
  },
  fulfilled: {
    label: 'Fulfilled',
    className: 'bg-green-100 text-green-700',
  },
  closed: {
    label: 'Closed',
    className: 'bg-gray-100 text-gray-600',
  },
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.open

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  }

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${config.className} ${sizeClasses[size]}`}
    >
      <span
        className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
          status === 'open'
            ? 'bg-blue-500'
            : status === 'in_progress'
            ? 'bg-yellow-500'
            : status === 'fulfilled'
            ? 'bg-green-500'
            : 'bg-gray-400'
        }`}
      />
      {config.label}
    </span>
  )
}
