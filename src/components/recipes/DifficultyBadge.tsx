'use client'

import { DifficultyLevel } from '@/types/database'

interface DifficultyBadgeProps {
  difficulty: DifficultyLevel
  size?: 'sm' | 'md'
}

const difficultyConfig: Record<DifficultyLevel, { label: string; color: string }> = {
  easy: { label: 'Easy', color: 'bg-green-100 text-green-700' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
  hard: { label: 'Hard', color: 'bg-orange-100 text-orange-700' },
  expert: { label: 'Expert', color: 'bg-red-100 text-red-700' },
}

export function DifficultyBadge({ difficulty, size = 'sm' }: DifficultyBadgeProps) {
  const config = difficultyConfig[difficulty]
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'

  return (
    <span className={`inline-flex items-center font-medium rounded-full ${config.color} ${sizeClasses}`}>
      {config.label}
    </span>
  )
}
