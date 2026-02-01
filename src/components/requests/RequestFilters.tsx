'use client'

import { RequestStatus, ContentType } from '@/types/database'

export interface RequestFiltersState {
  status: RequestStatus | 'all'
  type: ContentType | 'all'
  minBounty: number
  maxBounty: number | null
  sortBy: 'newest' | 'bounty' | 'deadline'
}

interface RequestFiltersProps {
  filters: RequestFiltersState
  onChange: (filters: RequestFiltersState) => void
}

const statusOptions: { value: RequestStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'fulfilled', label: 'Fulfilled' },
  { value: 'closed', label: 'Closed' },
]

const typeOptions: { value: ContentType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'gif', label: 'GIFs' },
  { value: 'meme', label: 'Memes' },
  { value: 'video', label: 'Videos' },
  { value: 'music', label: 'Music' },
]

const sortOptions: { value: 'newest' | 'bounty' | 'deadline'; label: string }[] = [
  { value: 'newest', label: 'Newest First' },
  { value: 'bounty', label: 'Highest Bounty' },
  { value: 'deadline', label: 'Deadline Soon' },
]

const bountyRanges = [
  { min: 0, max: null, label: 'Any Amount' },
  { min: 0, max: 0, label: 'No Bounty' },
  { min: 1, max: 50, label: '$1 - $50' },
  { min: 50, max: 100, label: '$50 - $100' },
  { min: 100, max: 500, label: '$100 - $500' },
  { min: 500, max: null, label: '$500+' },
]

export function RequestFilters({ filters, onChange }: RequestFiltersProps) {
  const handleStatusChange = (status: RequestStatus | 'all') => {
    onChange({ ...filters, status })
  }

  const handleTypeChange = (type: ContentType | 'all') => {
    onChange({ ...filters, type })
  }

  const handleSortChange = (sortBy: 'newest' | 'bounty' | 'deadline') => {
    onChange({ ...filters, sortBy })
  }

  const handleBountyChange = (minBounty: number, maxBounty: number | null) => {
    onChange({ ...filters, minBounty, maxBounty })
  }

  const currentBountyLabel =
    bountyRanges.find(
      (r) => r.min === filters.minBounty && r.max === filters.maxBounty
    )?.label || 'Any Amount'

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:flex-wrap">
      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        {statusOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => handleStatusChange(option.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filters.status === option.value
                ? 'bg-orange-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Type Filter */}
      <div className="flex items-center gap-2">
        <select
          value={filters.type}
          onChange={(e) => handleTypeChange(e.target.value as ContentType | 'all')}
          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white text-gray-700 border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        >
          {typeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Bounty Range */}
      <div className="relative group">
        <button className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white text-gray-700 border border-gray-200 hover:bg-gray-100 flex items-center gap-1">
          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.736 6.979C9.208 6.193 9.696 6 10 6c.304 0 .792.193 1.264.979a1 1 0 001.715-1.029C12.279 4.784 11.232 4 10 4s-2.279.784-2.979 1.95c-.285.475-.507 1-.67 1.55H6a1 1 0 000 2h.013a9.358 9.358 0 000 1H6a1 1 0 100 2h.351c.163.55.385 1.075.67 1.55C7.721 15.216 8.768 16 10 16s2.279-.784 2.979-1.95a1 1 0 10-1.715-1.029c-.472.786-.96.979-1.264.979-.304 0-.792-.193-1.264-.979a4.265 4.265 0 01-.264-.521H10a1 1 0 100-2H8.017a7.36 7.36 0 010-1H10a1 1 0 100-2H8.472c.08-.185.167-.36.264-.521z"
              clipRule="evenodd"
            />
          </svg>
          {currentBountyLabel}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div className="absolute top-full left-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
          {bountyRanges.map((range) => (
            <button
              key={range.label}
              onClick={() => handleBountyChange(range.min, range.max)}
              className={`block w-full text-left px-4 py-2 text-sm ${
                filters.minBounty === range.min && filters.maxBounty === range.max
                  ? 'bg-orange-50 text-orange-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sort */}
      <div className="sm:ml-auto flex items-center gap-2">
        <span className="text-sm text-gray-500">Sort:</span>
        <select
          value={filters.sortBy}
          onChange={(e) =>
            handleSortChange(e.target.value as 'newest' | 'bounty' | 'deadline')
          }
          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white text-gray-700 border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
