'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Recipe } from '@/types/database'
import { DifficultyBadge } from '@/components/recipes/DifficultyBadge'
import { COOKING_METHOD_LABELS } from '@/types/recipe'
import { CookingMethod } from '@/types/database'
import { VoteButtons } from '@/components/ui/VoteButtons'
import { useAuth } from '@/hooks/useAuth'

export default function RecipeDetailPage() {
  const params = useParams()
  const id = params.id as string
  const supabase = useMemo(() => createClient(), [])
  const { isAuthenticated } = useAuth()

  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null)

  useEffect(() => {
    const fetchRecipe = async () => {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('recipes' as any)
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching recipe:', error)
        setError('Recipe not found')
      } else {
        setRecipe(data as unknown as Recipe)
      }
      setIsLoading(false)
    }

    if (id) {
      fetchRecipe()
    }
  }, [id, supabase])

  const handleVote = useCallback(async (voteType: 'up' | 'down') => {
    const response = await fetch('/api/recipes/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipeId: id, vote: voteType }),
    })
    if (response.ok) {
      const data = await response.json()
      setRecipe((prev) => prev ? { ...prev, upvotes: data.upvotes, downvotes: data.downvotes } : prev)
      setUserVote(data.userVote || null)
      return { upvotes: data.upvotes, downvotes: data.downvotes }
    }
    return null
  }, [id])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-amber-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-500">Loading recipe...</p>
        </div>
      </div>
    )
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-lg">{error || 'Recipe not found'}</p>
          <Link href="/recipes" className="mt-4 inline-block text-amber-600 hover:text-amber-700 font-medium">
            Back to Recipes
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="relative">
        {recipe.image_url ? (
          <div className="h-64 md:h-80 relative">
            <img
              src={recipe.image_url}
              alt={recipe.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        ) : (
          <div className="h-48 md:h-64 bg-gradient-to-r from-amber-500 to-orange-600" />
        )}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          <div className="max-w-4xl mx-auto">
            <Link
              href="/recipes"
              className="inline-flex items-center gap-1 text-white/80 hover:text-white text-sm mb-3 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Recipes
            </Link>
            <h1 className="text-3xl md:text-4xl font-bold text-white">{recipe.title}</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="font-semibold text-gray-900 mb-3">About This Pizza</h2>
              <p className="text-gray-600 whitespace-pre-line">{recipe.description}</p>
            </div>

            {/* Toppings */}
            {recipe.toppings && recipe.toppings.length > 0 && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="font-semibold text-gray-900 mb-3">Toppings</h2>
                <div className="flex flex-wrap gap-2">
                  {recipe.toppings.map((topping) => (
                    <span
                      key={topping}
                      className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-sm font-medium"
                    >
                      {topping}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Cheeses */}
            {recipe.cheese_types && recipe.cheese_types.length > 0 && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="font-semibold text-gray-900 mb-3">Cheeses</h2>
                <div className="flex flex-wrap gap-2">
                  {recipe.cheese_types.map((cheese) => (
                    <span
                      key={cheese}
                      className="px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-full text-sm font-medium"
                    >
                      {cheese}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Prep Notes */}
            {recipe.prep_notes && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="font-semibold text-gray-900 mb-3">Prep Notes</h2>
                <p className="text-gray-600 whitespace-pre-line">{recipe.prep_notes}</p>
              </div>
            )}

            {/* Tags */}
            {recipe.tags && recipe.tags.length > 0 && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="font-semibold text-gray-900 mb-3">Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {recipe.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Voting */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="font-semibold text-gray-900 mb-3">Rate This Recipe</h2>
              <VoteButtons
                upvotes={recipe.upvotes ?? 0}
                downvotes={recipe.downvotes ?? 0}
                userVote={userVote}
                onVote={handleVote}
                size="md"
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick info card */}
            <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">Recipe Details</h2>

              {recipe.sauce_type && (
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Sauce</span>
                  <p className="text-gray-900 mt-0.5">{recipe.sauce_type}</p>
                </div>
              )}

              {recipe.dough_style && (
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Dough</span>
                  <p className="text-gray-900 mt-0.5">{recipe.dough_style}</p>
                </div>
              )}

              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Cooking Method</span>
                <p className="text-gray-900 mt-0.5">
                  {COOKING_METHOD_LABELS[recipe.cooking_method as CookingMethod] || recipe.cooking_method}
                </p>
              </div>

              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Difficulty</span>
                <div className="mt-1">
                  <DifficultyBadge difficulty={recipe.difficulty} size="md" />
                </div>
              </div>

              {(recipe.is_vegetarian || recipe.is_vegan) && (
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Dietary</span>
                  <div className="flex gap-2 mt-1">
                    {recipe.is_vegetarian && (
                      <span className="px-2.5 py-1 bg-green-50 text-green-600 text-sm rounded-full font-medium">
                        Vegetarian
                      </span>
                    )}
                    {recipe.is_vegan && (
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-sm rounded-full font-medium">
                        Vegan
                      </span>
                    )}
                  </div>
                </div>
              )}

              {recipe.creator && (
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</span>
                  <p className="text-gray-900 mt-0.5">{recipe.creator}</p>
                </div>
              )}

              {recipe.source_url && (
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Source</span>
                  <a
                    href={recipe.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-600 hover:text-amber-700 text-sm mt-0.5 block truncate"
                  >
                    View source
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
