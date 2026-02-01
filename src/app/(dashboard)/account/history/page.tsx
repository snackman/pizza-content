'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useViewHistory } from '@/hooks/useViewHistory'
import { ContentCard } from '@/components/content/ContentCard'

export default function HistoryPage() {
  const { history, groupedHistory, isLoading, clearHistory } = useViewHistory()
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const handleClearHistory = async () => {
    await clearHistory()
    setShowClearConfirm(false)
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 bg-gray-200 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  const hasHistory = history.length > 0

  const HistoryGroup = ({
    title,
    items,
  }: {
    title: string
    items: typeof history
  }) => {
    if (items.length === 0) return null

    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          {title}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <ContentCard key={item.id} item={item.content} showType />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">View History</h1>
          <p className="text-gray-500 mt-1">Content you&apos;ve recently viewed</p>
        </div>
        {hasHistory && (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="px-4 py-2 text-red-600 hover:bg-red-50 font-medium rounded-lg transition-colors"
          >
            Clear History
          </button>
        )}
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Clear View History?
            </h3>
            <p className="text-gray-500 mb-6">
              This will permanently delete your entire view history. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearHistory}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
              >
                Clear History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Content */}
      {!hasHistory ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="text-5xl mb-4">🕐</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No viewing history
          </h3>
          <p className="text-gray-500 mb-6">
            Content you view will appear here for easy access.
          </p>
          <Link
            href="/browse"
            className="inline-block px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors"
          >
            Browse Content
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          <HistoryGroup title="Today" items={groupedHistory.today} />
          <HistoryGroup title="Yesterday" items={groupedHistory.yesterday} />
          <HistoryGroup title="This Week" items={groupedHistory.thisWeek} />
          <HistoryGroup title="Earlier" items={groupedHistory.earlier} />
        </div>
      )}

      {/* Summary */}
      {hasHistory && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500 text-center">
            Showing {history.length} items (limited to last 100)
          </p>
        </div>
      )}
    </div>
  )
}
