'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Content } from '@/types/database'

interface FavoriteWithContent {
  id: string
  user_id: string
  content_id: string
  created_at: string
  content: Content
}

interface UseFavoritesReturn {
  favorites: Content[]
  favoriteIds: Set<string>
  isLoading: boolean
  isFavorite: (contentId: string) => boolean
  addFavorite: (contentId: string) => Promise<void>
  removeFavorite: (contentId: string) => Promise<void>
  toggleFavorite: (contentId: string) => Promise<void>
  refetch: () => Promise<void>
}

export function useFavorites(): UseFavoritesReturn {
  const [favorites, setFavorites] = useState<Content[]>([])
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const { user, isAuthenticated } = useAuth()
  const supabase = createClient()

  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([])
      setFavoriteIds(new Set())
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('*, content(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching favorites:', error)
        return
      }

      const favoritesWithContent = data as unknown as FavoriteWithContent[]
      const contentItems = favoritesWithContent
        .map(f => f.content)
        .filter(Boolean) as Content[]

      setFavorites(contentItems)
      setFavoriteIds(new Set(contentItems.map(c => c.id)))
    } catch (error) {
      console.error('Error fetching favorites:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user, supabase])

  useEffect(() => {
    fetchFavorites()
  }, [fetchFavorites])

  const isFavorite = useCallback((contentId: string) => {
    return favoriteIds.has(contentId)
  }, [favoriteIds])

  const addFavorite = useCallback(async (contentId: string) => {
    if (!user) return

    // Optimistic update
    setFavoriteIds(prev => new Set([...prev, contentId]))

    try {
      const { error } = await supabase
        .from('favorites')
        .insert({
          user_id: user.id,
          content_id: contentId,
        })

      if (error) {
        // Revert on error
        setFavoriteIds(prev => {
          const next = new Set(prev)
          next.delete(contentId)
          return next
        })
        console.error('Error adding favorite:', error)
        return
      }

      // Refetch to get the content data
      await fetchFavorites()
    } catch (error) {
      // Revert on error
      setFavoriteIds(prev => {
        const next = new Set(prev)
        next.delete(contentId)
        return next
      })
      console.error('Error adding favorite:', error)
    }
  }, [user, supabase, fetchFavorites])

  const removeFavorite = useCallback(async (contentId: string) => {
    if (!user) return

    // Optimistic update
    const wasInFavorites = favoriteIds.has(contentId)
    setFavoriteIds(prev => {
      const next = new Set(prev)
      next.delete(contentId)
      return next
    })
    setFavorites(prev => prev.filter(c => c.id !== contentId))

    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('content_id', contentId)

      if (error) {
        // Revert on error
        if (wasInFavorites) {
          setFavoriteIds(prev => new Set([...prev, contentId]))
        }
        await fetchFavorites() // Refetch to restore state
        console.error('Error removing favorite:', error)
      }
    } catch (error) {
      // Revert on error
      if (wasInFavorites) {
        setFavoriteIds(prev => new Set([...prev, contentId]))
      }
      await fetchFavorites()
      console.error('Error removing favorite:', error)
    }
  }, [user, supabase, favoriteIds, fetchFavorites])

  const toggleFavorite = useCallback(async (contentId: string) => {
    if (isFavorite(contentId)) {
      await removeFavorite(contentId)
    } else {
      await addFavorite(contentId)
    }
  }, [isFavorite, addFavorite, removeFavorite])

  return {
    favorites,
    favoriteIds,
    isLoading,
    isFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    refetch: fetchFavorites,
  }
}
