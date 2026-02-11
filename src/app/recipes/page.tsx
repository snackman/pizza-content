'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Recipe } from '@/types/database'
import { RecipeCard } from '@/components/recipes/RecipeCard'
import { RecipeFilters } from '@/components/recipes/RecipeFilters'
import { RecipeFilters as RecipeFiltersType } from '@/types/recipe'

const ITEMS_PER_PAGE = 24

const defaultFilters: RecipeFiltersType = {
  search: '',
  sauceType: '',
  doughStyle: '',
  cookingMethod: '',
  difficulty: '',
  isDietary: false,
  sort: 'newest',
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [filters, setFilters] = useState<RecipeFiltersType>(defaultFilters)
  const [totalCount, setTotalCount] = useState<number>(0)

  const sentinelRef = useRef<HTMLDivElement>(null)
  const supabase = useMemo(() => createClient(), [])

  const fetchRecipes = useCallback(async (pageNum: number, reset: boolean = false) => {
    if (reset) {
      setIsLoading(true)
    } else {
      setIsLoadingMore(true)
    }

    const from = pageNum * ITEMS_PER_PAGE
    const to = from + ITEMS_PER_PAGE - 1

    let query = supabase
      .from('recipes' as any)
      .select('*')
      .in('status', ['approved', 'featured'])

    // Apply server-side filters
    if (filters.sauceType) {
      query = query.eq('sauce_type', filters.sauceType)
    }
    if (filters.doughStyle) {
      query = query.eq('dough_style', filters.doughStyle)
    }
    if (filters.cookingMethod) {
      query = query.eq('cooking_method', filters.cookingMethod)
    }
    if (filters.difficulty) {
      query = query.eq('difficulty', filters.difficulty)
    }
    if (filters.isDietary) {
      query = query.or('is_vegetarian.eq.true,is_vegan.eq.true')
    }

    // Sort
    if (filters.sort === 'popular') {
      query = query.order('upvotes', { ascending: false })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    query = query.range(from, to)

    const { data, error } = await query

    if (error) {
      console.error('Error fetching recipes:', error)
    } else {
      const newItems = (data || []) as unknown as Recipe[]
      if (reset) {
        setRecipes(newItems)
      } else {
        setRecipes((prev) => [...prev, ...newItems])
      }
      setHasMore(newItems.length === ITEMS_PER_PAGE)
    }

    setIsLoading(false)
    setIsLoadingMore(false)
  }, [filters, supabase])

  // Fetch total count
  const fetchTotalCount = useCallback(async () => {
    let query = supabase
      .from('recipes' as any)
      .select('*', { count: 'exact', head: true })
      .in('status', ['approved', 'featured'])

    if (filters.sauceType) {
      query = query.eq('sauce_type', filters.sauceType)
    }
    if (filters.doughStyle) {
      query = query.eq('dough_style', filters.doughStyle)
    }
    if (filters.cookingMethod) {
      query = query.eq('cooking_method', filters.cookingMethod)
    }
    if (filters.difficulty) {
      query = query.eq('difficulty', filters.difficulty)
    }
    if (filters.isDietary) {
      query = query.or('is_vegetarian.eq.true,is_vegan.eq.true')
    }

    const { count } = await query
    setTotalCount(count || 0)
  }, [filters, supabase])

  // Initial load and filter changes
  useEffect(() => {
    setPage(0)
    setHasMore(true)
    fetchRecipes(0, true)
    fetchTotalCount()
  }, [filters]) // eslint-disable-line react-hooks/exhaustive-deps

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          setPage((prev) => {
            const nextPage = prev + 1
            fetchRecipes(nextPage, false)
            return nextPage
          })
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, isLoading, isLoadingMore, fetchRecipes])

  // Client-side search filter
  const filteredRecipes = recipes.filter((recipe) => {
    if (!filters.search) return true
    const query = filters.search.toLowerCase()
    return (
      recipe.title.toLowerCase().includes(query) ||
      recipe.toppings?.some((t) => t.toLowerCase().includes(query)) ||
      recipe.tags?.some((t) => t.toLowerCase().includes(query)) ||
      recipe.description?.toLowerCase().includes(query)
    )
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-5xl">📖</span>
              <div>
                <h1 className="text-4xl font-bold">Pizza Recipes</h1>
                <p className="text-amber-100 mt-1">
                  Creative pizza recipe ideas and novel combinations
                </p>
              </div>
            </div>
            <Link
              href="/recipes/submit"
              className="hidden sm:inline-flex px-6 py-3 bg-white text-amber-600 font-bold rounded-lg hover:bg-amber-50 transition-colors"
            >
              Submit a Recipe
            </Link>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <RecipeFilters filters={filters} onChange={setFilters} />
        <div className="flex items-center justify-between mt-4">
          <p className="text-gray-500">
            {totalCount.toLocaleString()} recipe{totalCount !== 1 ? 's' : ''}
          </p>
          <Link
            href="/recipes/submit"
            className="sm:hidden px-4 py-2 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 transition-colors text-sm"
          >
            Submit Recipe
          </Link>
        </div>
      </div>

      {/* Recipe Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {isLoading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-amber-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-500">Loading recipes...</p>
          </div>
        ) : filteredRecipes.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">No recipes found</p>
            <Link
              href="/recipes/submit"
              className="mt-4 inline-block text-amber-600 hover:text-amber-700 font-medium"
            >
              Be the first to submit one!
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRecipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>

            {/* Sentinel for infinite scroll */}
            <div ref={sentinelRef} className="h-10 mt-8">
              {isLoadingMore && (
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-amber-500 border-t-transparent"></div>
                  <p className="mt-2 text-gray-500 text-sm">Loading more...</p>
                </div>
              )}
              {!hasMore && recipes.length > 0 && (
                <p className="text-center text-gray-400 text-sm">
                  That&apos;s all the recipes!
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
