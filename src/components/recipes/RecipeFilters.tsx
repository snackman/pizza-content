'use client'

import { RecipeFilters as RecipeFiltersType } from '@/types/recipe'
import { SAUCE_TYPES, DOUGH_STYLES, COOKING_METHOD_LABELS, DIFFICULTY_LABELS } from '@/types/recipe'
import { CookingMethod, DifficultyLevel } from '@/types/database'

interface RecipeFiltersProps {
  filters: RecipeFiltersType
  onChange: (filters: RecipeFiltersType) => void
}

export function RecipeFilters({ filters, onChange }: RecipeFiltersProps) {
  const updateFilter = (key: keyof RecipeFiltersType, value: string | boolean) => {
    onChange({ ...filters, [key]: value })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <input
          type="text"
          placeholder="Search recipes..."
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        />

        {/* Sauce Type */}
        <select
          value={filters.sauceType}
          onChange={(e) => updateFilter('sauceType', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white text-sm"
        >
          <option value="">All Sauces</option>
          {SAUCE_TYPES.map((sauce) => (
            <option key={sauce} value={sauce}>{sauce}</option>
          ))}
        </select>

        {/* Dough Style */}
        <select
          value={filters.doughStyle}
          onChange={(e) => updateFilter('doughStyle', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white text-sm"
        >
          <option value="">All Doughs</option>
          {DOUGH_STYLES.map((dough) => (
            <option key={dough} value={dough}>{dough}</option>
          ))}
        </select>

        {/* Cooking Method */}
        <select
          value={filters.cookingMethod}
          onChange={(e) => updateFilter('cookingMethod', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white text-sm"
        >
          <option value="">All Methods</option>
          {(Object.entries(COOKING_METHOD_LABELS) as [CookingMethod, string][]).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        {/* Difficulty */}
        <select
          value={filters.difficulty}
          onChange={(e) => updateFilter('difficulty', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white text-sm"
        >
          <option value="">All Difficulties</option>
          {(Object.entries(DIFFICULTY_LABELS) as [DifficultyLevel, string][]).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        {/* Dietary Toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.isDietary}
            onChange={(e) => updateFilter('isDietary', e.target.checked)}
            className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
          />
          <span className="text-sm text-gray-700">Vegetarian/Vegan</span>
        </label>

        {/* Sort */}
        <select
          value={filters.sort}
          onChange={(e) => updateFilter('sort', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white text-sm"
        >
          <option value="newest">Newest</option>
          <option value="popular">Most Popular</option>
        </select>
      </div>
    </div>
  )
}
