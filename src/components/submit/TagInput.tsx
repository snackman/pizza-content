'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  disabled?: boolean
  maxTags?: number
}

export function TagInput({
  value,
  onChange,
  disabled = false,
  maxTags = 5,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Fetch tag suggestions based on input
  const fetchSuggestions = useCallback(
    async (query: string) => {
      if (!query || query.length < 2) {
        setSuggestions([])
        return
      }

      setIsLoading(true)
      try {
        // Get unique tags from existing content
        const { data, error } = await supabase
          .from('content')
          .select('tags')
          .not('tags', 'is', null)
          .limit(100)

        if (error) throw error

        // Extract and flatten all tags
        const allTags = data
          ?.flatMap((item) => (item as { tags?: string[] }).tags || [])
          .filter((tag): tag is string => typeof tag === 'string')

        // Get unique tags that match the query
        const uniqueTags = [...new Set(allTags)]
          .filter(
            (tag) =>
              tag.toLowerCase().includes(query.toLowerCase()) &&
              !value.includes(tag)
          )
          .slice(0, 5)

        setSuggestions(uniqueTags)
      } catch (error) {
        console.error('Error fetching tags:', error)
        setSuggestions([])
      } finally {
        setIsLoading(false)
      }
    },
    [supabase, value]
  )

  // Debounce tag search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSuggestions(inputValue)
    }, 300)

    return () => clearTimeout(timer)
  }, [inputValue, fetchSuggestions])

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const addTag = (tag: string) => {
    const normalizedTag = tag.trim().toLowerCase()
    if (
      normalizedTag &&
      !value.includes(normalizedTag) &&
      value.length < maxTags
    ) {
      onChange([...value, normalizedTag])
    }
    setInputValue('')
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (inputValue.trim()) {
        addTag(inputValue)
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1])
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Tags <span className="text-gray-400">(optional)</span>
      </label>

      <div
        className={`
          flex flex-wrap gap-2 p-3 border rounded-lg focus-within:ring-2 focus-within:ring-orange-500 focus-within:border-transparent
          ${disabled ? 'bg-gray-50 opacity-50' : 'bg-white'}
        `}
      >
        {/* Selected tags */}
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm"
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="text-orange-500 hover:text-orange-700"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </span>
        ))}

        {/* Input */}
        {value.length < maxTags && (
          <div className="relative flex-1 min-w-[120px]">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value)
                setShowSuggestions(true)
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              placeholder={value.length === 0 ? 'Add tags...' : ''}
              className="w-full border-none focus:ring-0 p-0 text-sm placeholder:text-gray-400"
            />

            {/* Suggestions dropdown */}
            {showSuggestions && (suggestions.length > 0 || isLoading) && (
              <div
                ref={suggestionsRef}
                className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10"
              >
                {isLoading ? (
                  <div className="px-3 py-2 text-sm text-gray-500">Loading...</div>
                ) : (
                  suggestions.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => addTag(tag)}
                      className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700"
                    >
                      {tag}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-sm text-gray-500">
        {value.length}/{maxTags} tags. Press Enter or comma to add.
      </p>
    </div>
  )
}
