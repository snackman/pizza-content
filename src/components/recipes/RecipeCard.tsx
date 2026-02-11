'use client'

import Link from 'next/link'
import { Recipe } from '@/types/database'
import { DifficultyBadge } from './DifficultyBadge'

interface RecipeCardProps {
  recipe: Recipe
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  const displayToppings = recipe.toppings?.slice(0, 3) || []
  const remainingToppings = (recipe.toppings?.length || 0) - 3

  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow group"
    >
      {/* Image or placeholder */}
      <div className="aspect-video relative bg-gray-100">
        {recipe.image_url ? (
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-400 to-orange-600 text-white">
            <span className="text-5xl group-hover:scale-110 transition-transform">
              📖
            </span>
          </div>
        )}
        {/* Difficulty badge overlay */}
        <div className="absolute top-2 right-2">
          <DifficultyBadge difficulty={recipe.difficulty} />
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 truncate group-hover:text-amber-600 transition-colors" title={recipe.title}>
          {recipe.title}
        </h3>

        {/* Sauce + Dough badges */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {recipe.sauce_type && (
            <span className="px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded-full font-medium">
              {recipe.sauce_type}
            </span>
          )}
          {recipe.dough_style && (
            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full font-medium">
              {recipe.dough_style}
            </span>
          )}
        </div>

        {/* Toppings */}
        {displayToppings.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {displayToppings.map((topping) => (
              <span
                key={topping}
                className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
              >
                {topping}
              </span>
            ))}
            {remainingToppings > 0 && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
                +{remainingToppings} more
              </span>
            )}
          </div>
        )}

        {/* Dietary + Votes */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex gap-1">
            {recipe.is_vegetarian && (
              <span className="px-2 py-0.5 bg-green-50 text-green-600 text-xs rounded-full font-medium">
                Vegetarian
              </span>
            )}
            {recipe.is_vegan && (
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-xs rounded-full font-medium">
                Vegan
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span title="Upvotes">+{recipe.upvotes ?? 0}</span>
            <span title="Downvotes">-{recipe.downvotes ?? 0}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
