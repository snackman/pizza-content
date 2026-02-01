'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Content } from '@/types/database'

interface ViewHistoryItem {
  id: string
  user_id: string
  content_id: string
  viewed_at: string
  content: Content
}

interface GroupedHistory {
  today: ViewHistoryItem[]
  yesterday: ViewHistoryItem[]
  thisWeek: ViewHistoryItem[]
  earlier: ViewHistoryItem[]
}

interface UseViewHistoryReturn {
  history: ViewHistoryItem[]
  groupedHistory: GroupedHistory
  isLoading: boolean
  trackView: (contentId: string) => Promise<void>
  clearHistory: () => Promise<void>
  refetch: () => Promise<void>
}

function groupByDate(items: ViewHistoryItem[]): GroupedHistory {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)

  const groups: GroupedHistory = {
    today: [],
    yesterday: [],
    thisWeek: [],
    earlier: [],
  }

  for (const item of items) {
    const viewedAt = new Date(item.viewed_at)

    if (viewedAt >= today) {
      groups.today.push(item)
    } else if (viewedAt >= yesterday) {
      groups.yesterday.push(item)
    } else if (viewedAt >= weekAgo) {
      groups.thisWeek.push(item)
    } else {
      groups.earlier.push(item)
    }
  }

  return groups
}

export function useViewHistory(): UseViewHistoryReturn {
  const [history, setHistory] = useState<ViewHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()
  const supabase = createClient()

  const fetchHistory = useCallback(async () => {
    if (!user) {
      setHistory([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('view_history')
        .select('*, content(*)')
        .eq('user_id', user.id)
        .order('viewed_at', { ascending: false })
        .limit(100)

      if (error) {
        console.error('Error fetching view history:', error)
        return
      }

      const historyWithContent = (data as unknown as ViewHistoryItem[])
        .filter(item => item.content) // Filter out deleted content

      setHistory(historyWithContent)
    } catch (error) {
      console.error('Error fetching view history:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user, supabase])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const trackView = useCallback(async (contentId: string) => {
    if (!user) return

    try {
      // Upsert to handle duplicate views - update viewed_at if exists
      const { error } = await supabase
        .from('view_history')
        .upsert(
          {
            user_id: user.id,
            content_id: contentId,
            viewed_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,content_id',
          }
        )

      if (error) {
        // If upsert fails due to no unique constraint, try regular insert
        // This handles the case where the table doesn't have the constraint
        const { error: insertError } = await supabase
          .from('view_history')
          .insert({
            user_id: user.id,
            content_id: contentId,
          })

        if (insertError) {
          console.error('Error tracking view:', insertError)
        }
      }
    } catch (error) {
      console.error('Error tracking view:', error)
    }
  }, [user, supabase])

  const clearHistory = useCallback(async () => {
    if (!user) return

    setHistory([]) // Optimistic update

    try {
      const { error } = await supabase
        .from('view_history')
        .delete()
        .eq('user_id', user.id)

      if (error) {
        console.error('Error clearing history:', error)
        await fetchHistory() // Revert on error
      }
    } catch (error) {
      console.error('Error clearing history:', error)
      await fetchHistory() // Revert on error
    }
  }, [user, supabase, fetchHistory])

  const groupedHistory = groupByDate(history)

  return {
    history,
    groupedHistory,
    isLoading,
    trackView,
    clearHistory,
    refetch: fetchHistory,
  }
}
