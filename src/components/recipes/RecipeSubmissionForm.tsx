'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { CookingMethod, DifficultyLevel } from '@/types/database'
import {
  SAUCE_TYPES,
  DOUGH_STYLES,
  COMMON_CHEESES,
  POPULAR_TOPPINGS,
  COOKING_METHOD_LABELS,
  DIFFICULTY_LABELS,
} from '@/types/recipe'

export function RecipeSubmissionForm() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [sauceType, setSauceType] = useState('')
  const [toppings, setToppings] = useState<string[]>([])
  const [toppingInput, setToppingInput] = useState('')
  const [cheeseTypes, setCheeseTypes] = useState<string[]>([])
  const [cheeseInput, setCheeseInput] = useState('')
  const [doughStyle, setDoughStyle] = useState('')
  const [cookingMethod, setCookingMethod] = useState<CookingMethod>('oven')
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium')
  const [prepNotes, setPrepNotes] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [isVegetarian, setIsVegetarian] = useState(false)
  const [isVegan, setIsVegan] = useState(false)
  const [creator, setCreator] = useState('')

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [submittedId, setSubmittedId] = useState<string | null>(null)

  const addChip = (
    value: string,
    list: string[],
    setList: (v: string[]) => void,
    setInput: (v: string) => void,
    maxItems: number = 15
  ) => {
    const trimmed = value.trim()
    if (trimmed && !list.includes(trimmed) && list.length < maxItems) {
      setList([...list, trimmed])
    }
    setInput('')
  }

  const removeChip = (value: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.filter((item) => item !== value))
  }

  const handleChipKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    value: string,
    list: string[],
    setList: (v: string[]) => void,
    setInput: (v: string) => void,
    maxItems?: number
  ) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addChip(value, list, setList, setInput, maxItems)
    } else if (e.key === 'Backspace' && !value && list.length > 0) {
      setList(list.slice(0, -1))
    }
  }

  const canSubmit = () => {
    return title.trim().length > 0 && description.trim().length > 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      setError('You must be logged in to submit a recipe')
      return
    }

    if (!canSubmit()) {
      setError('Please fill in the title and description')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const insertData = {
        title: title.trim(),
        description: description.trim(),
        sauce_type: sauceType || null,
        cheese_types: cheeseTypes,
        toppings: toppings,
        dough_style: doughStyle || null,
        cooking_method: cookingMethod,
        difficulty: difficulty,
        prep_notes: prepNotes.trim() || null,
        image_url: imageUrl.trim() || null,
        tags: tags,
        is_vegetarian: isVegetarian,
        is_vegan: isVegan,
        creator: creator.trim() || null,
        status: 'approved' as const,
        submitted_by: user.id,
      }

      const { data, error: insertError } = await supabase
        .from('recipes' as any)
        .insert(insertData as any)
        .select('id')
        .single()

      if (insertError) {
        throw insertError
      }

      setSubmittedId((data as any)?.id || null)
      setSuccess(true)
    } catch (err) {
      console.error('Submission error:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit recipe. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="text-6xl mb-4">🍕</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Recipe Submitted!
          </h2>
          <p className="text-gray-600 mb-6">
            Your creative pizza recipe has been added to the collection.
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => {
                setSuccess(false)
                setTitle('')
                setDescription('')
                setSauceType('')
                setToppings([])
                setCheeseTypes([])
                setDoughStyle('')
                setCookingMethod('oven')
                setDifficulty('medium')
                setPrepNotes('')
                setImageUrl('')
                setTags([])
                setIsVegetarian(false)
                setIsVegan(false)
                setCreator('')
                setSubmittedId(null)
              }}
              className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Submit Another
            </button>
            {submittedId ? (
              <button
                onClick={() => router.push(`/recipes/${submittedId}`)}
                className="px-6 py-3 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 transition-colors"
              >
                View Recipe
              </button>
            ) : (
              <button
                onClick={() => router.push('/recipes')}
                className="px-6 py-3 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 transition-colors"
              >
                Browse Recipes
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Submit a Recipe
      </h2>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Title */}
      <div className="mb-6">
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          Recipe Name <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isSubmitting}
          maxLength={150}
          placeholder="e.g., Truffle Mushroom & Burrata Pizza"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50"
          required
        />
        <p className="mt-1 text-sm text-gray-500">{title.length}/150 characters</p>
      </div>

      {/* Description */}
      <div className="mb-6">
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isSubmitting}
          maxLength={1000}
          rows={3}
          placeholder="What makes this pizza special? Describe the flavor profile, inspiration, etc."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none disabled:opacity-50"
          required
        />
        <p className="mt-1 text-sm text-gray-500">{description.length}/1000 characters</p>
      </div>

      {/* Sauce Type */}
      <div className="mb-6">
        <label htmlFor="sauce" className="block text-sm font-medium text-gray-700 mb-1">
          Sauce Type
        </label>
        <select
          id="sauce"
          value={sauceType}
          onChange={(e) => setSauceType(e.target.value)}
          disabled={isSubmitting}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white disabled:opacity-50"
        >
          <option value="">Select sauce...</option>
          {SAUCE_TYPES.map((sauce) => (
            <option key={sauce} value={sauce}>{sauce}</option>
          ))}
        </select>
      </div>

      {/* Toppings */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Toppings
        </label>
        <div className="flex flex-wrap gap-2 p-3 border rounded-lg focus-within:ring-2 focus-within:ring-amber-500 focus-within:border-transparent bg-white min-h-[48px]">
          {toppings.map((topping) => (
            <span
              key={topping}
              className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm"
            >
              {topping}
              <button
                type="button"
                onClick={() => removeChip(topping, toppings, setToppings)}
                className="text-amber-500 hover:text-amber-700"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
          <input
            type="text"
            value={toppingInput}
            onChange={(e) => setToppingInput(e.target.value)}
            onKeyDown={(e) => handleChipKeyDown(e, toppingInput, toppings, setToppings, setToppingInput)}
            disabled={isSubmitting}
            placeholder={toppings.length === 0 ? 'Type and press Enter...' : ''}
            className="flex-1 min-w-[120px] border-none focus:ring-0 p-0 text-sm placeholder:text-gray-400"
          />
        </div>
        {/* Quick-add suggestions */}
        <div className="flex flex-wrap gap-1 mt-2">
          {POPULAR_TOPPINGS.filter((t) => !toppings.includes(t)).slice(0, 8).map((topping) => (
            <button
              key={topping}
              type="button"
              onClick={() => addChip(topping, toppings, setToppings, setToppingInput)}
              className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full hover:bg-amber-100 hover:text-amber-700 transition-colors"
            >
              + {topping}
            </button>
          ))}
        </div>
      </div>

      {/* Cheese Types */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Cheese Types
        </label>
        <div className="flex flex-wrap gap-2 p-3 border rounded-lg focus-within:ring-2 focus-within:ring-amber-500 focus-within:border-transparent bg-white min-h-[48px]">
          {cheeseTypes.map((cheese) => (
            <span
              key={cheese}
              className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm"
            >
              {cheese}
              <button
                type="button"
                onClick={() => removeChip(cheese, cheeseTypes, setCheeseTypes)}
                className="text-yellow-500 hover:text-yellow-700"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
          <input
            type="text"
            value={cheeseInput}
            onChange={(e) => setCheeseInput(e.target.value)}
            onKeyDown={(e) => handleChipKeyDown(e, cheeseInput, cheeseTypes, setCheeseTypes, setCheeseInput)}
            disabled={isSubmitting}
            placeholder={cheeseTypes.length === 0 ? 'Type and press Enter...' : ''}
            className="flex-1 min-w-[120px] border-none focus:ring-0 p-0 text-sm placeholder:text-gray-400"
          />
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {COMMON_CHEESES.filter((c) => !cheeseTypes.includes(c)).slice(0, 6).map((cheese) => (
            <button
              key={cheese}
              type="button"
              onClick={() => addChip(cheese, cheeseTypes, setCheeseTypes, setCheeseInput)}
              className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full hover:bg-yellow-100 hover:text-yellow-700 transition-colors"
            >
              + {cheese}
            </button>
          ))}
        </div>
      </div>

      {/* Dough Style */}
      <div className="mb-6">
        <label htmlFor="dough" className="block text-sm font-medium text-gray-700 mb-1">
          Dough Style
        </label>
        <select
          id="dough"
          value={doughStyle}
          onChange={(e) => setDoughStyle(e.target.value)}
          disabled={isSubmitting}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white disabled:opacity-50"
        >
          <option value="">Select dough style...</option>
          {DOUGH_STYLES.map((dough) => (
            <option key={dough} value={dough}>{dough}</option>
          ))}
        </select>
      </div>

      {/* Cooking Method + Difficulty (side by side) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
        <div>
          <label htmlFor="method" className="block text-sm font-medium text-gray-700 mb-1">
            Cooking Method
          </label>
          <select
            id="method"
            value={cookingMethod}
            onChange={(e) => setCookingMethod(e.target.value as CookingMethod)}
            disabled={isSubmitting}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white disabled:opacity-50"
          >
            {(Object.entries(COOKING_METHOD_LABELS) as [CookingMethod, string][]).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-1">
            Difficulty
          </label>
          <select
            id="difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
            disabled={isSubmitting}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white disabled:opacity-50"
          >
            {(Object.entries(DIFFICULTY_LABELS) as [DifficultyLevel, string][]).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Prep Notes */}
      <div className="mb-6">
        <label htmlFor="prepNotes" className="block text-sm font-medium text-gray-700 mb-1">
          Prep Notes <span className="text-gray-400">(optional)</span>
        </label>
        <textarea
          id="prepNotes"
          value={prepNotes}
          onChange={(e) => setPrepNotes(e.target.value)}
          disabled={isSubmitting}
          maxLength={2000}
          rows={4}
          placeholder="Any tips for preparation, baking temperature, special techniques..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none disabled:opacity-50"
        />
      </div>

      {/* Image URL */}
      <div className="mb-6">
        <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700 mb-1">
          Image URL <span className="text-gray-400">(optional)</span>
        </label>
        <input
          id="imageUrl"
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          disabled={isSubmitting}
          placeholder="https://... (link to a photo of this pizza)"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50"
        />
      </div>

      {/* Tags */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tags <span className="text-gray-400">(optional)</span>
        </label>
        <div className="flex flex-wrap gap-2 p-3 border rounded-lg focus-within:ring-2 focus-within:ring-amber-500 focus-within:border-transparent bg-white min-h-[48px]">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeChip(tag, tags, setTags)}
                className="text-orange-500 hover:text-orange-700"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
          {tags.length < 5 && (
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => handleChipKeyDown(e, tagInput, tags, setTags, setTagInput, 5)}
              disabled={isSubmitting}
              placeholder={tags.length === 0 ? 'Add tags...' : ''}
              className="flex-1 min-w-[120px] border-none focus:ring-0 p-0 text-sm placeholder:text-gray-400"
            />
          )}
        </div>
        <p className="mt-1 text-sm text-gray-500">{tags.length}/5 tags. Press Enter or comma to add.</p>
      </div>

      {/* Dietary checkboxes */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Dietary
        </label>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isVegetarian}
              onChange={(e) => setIsVegetarian(e.target.checked)}
              disabled={isSubmitting}
              className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
            />
            <span className="text-sm text-gray-700">Vegetarian</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isVegan}
              onChange={(e) => {
                setIsVegan(e.target.checked)
                if (e.target.checked) setIsVegetarian(true)
              }}
              disabled={isSubmitting}
              className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
            />
            <span className="text-sm text-gray-700">Vegan</span>
          </label>
        </div>
      </div>

      {/* Creator */}
      <div className="mb-8">
        <label htmlFor="creator" className="block text-sm font-medium text-gray-700 mb-1">
          Creator Name <span className="text-gray-400">(optional)</span>
        </label>
        <input
          id="creator"
          type="text"
          value={creator}
          onChange={(e) => setCreator(e.target.value)}
          disabled={isSubmitting}
          maxLength={100}
          placeholder="Who created this recipe?"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting || !canSubmit()}
        className="w-full py-4 px-6 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Submitting...
          </span>
        ) : (
          'Submit Recipe'
        )}
      </button>
    </form>
  )
}
