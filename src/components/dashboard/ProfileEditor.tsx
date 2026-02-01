'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Profile } from '@/types/database'

interface ProfileEditorProps {
  onSuccess?: () => void
}

export function ProfileEditor({ onSuccess }: ProfileEditorProps) {
  const { profile, updateProfile, refreshProfile } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    display_name: profile?.display_name || '',
    username: profile?.username || '',
    bio: profile?.bio || '',
    is_pizzeria: profile?.is_pizzeria || false,
    // Pizzeria fields
    business_name: profile?.business_name || '',
    business_address: profile?.business_address || '',
    city: profile?.city || '',
    state: profile?.state || '',
    country: profile?.country || 'US',
    postal_code: profile?.postal_code || '',
    website_url: profile?.website_url || '',
    phone: profile?.phone || '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setSuccess(false)

    try {
      const updates: Partial<Profile> = {
        display_name: formData.display_name || null,
        username: formData.username || null,
        bio: formData.bio || null,
        is_pizzeria: formData.is_pizzeria,
      }

      // Only include pizzeria fields if is_pizzeria is true
      if (formData.is_pizzeria) {
        updates.business_name = formData.business_name || null
        updates.business_address = formData.business_address || null
        updates.city = formData.city || null
        updates.state = formData.state || null
        updates.country = formData.country || null
        updates.postal_code = formData.postal_code || null
        updates.website_url = formData.website_url || null
        updates.phone = formData.phone || null
      } else {
        // Clear pizzeria fields if not a pizzeria
        updates.business_name = null
        updates.business_address = null
        updates.city = null
        updates.state = null
        updates.country = null
        updates.postal_code = null
        updates.website_url = null
        updates.phone = null
      }

      const { error: updateError } = await updateProfile(updates)

      if (updateError) {
        setError(updateError.message)
        return
      }

      await refreshProfile()
      setSuccess(true)
      onSuccess?.()
    } catch (err) {
      setError('An unexpected error occurred')
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          Profile updated successfully!
        </div>
      )}

      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>

        <div>
          <label htmlFor="display_name" className="block text-sm font-medium text-gray-700 mb-1">
            Display Name
          </label>
          <input
            type="text"
            id="display_name"
            name="display_name"
            value={formData.display_name}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="Your display name"
          />
        </div>

        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
            Username
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-500">@</span>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="username"
            />
          </div>
        </div>

        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
            Bio
          </label>
          <textarea
            id="bio"
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
            placeholder="Tell us about yourself..."
          />
        </div>
      </div>

      {/* Pizzeria Toggle */}
      <div className="border-t border-gray-200 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Pizzeria Account</h3>
            <p className="text-sm text-gray-500">Enable this if you represent a pizza business</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="is_pizzeria"
              checked={formData.is_pizzeria}
              onChange={handleChange}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
          </label>
        </div>

        {/* Verification Status */}
        {profile?.is_pizzeria && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              {profile.is_verified ? (
                <>
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-green-600 font-medium">Verified Pizzeria</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-yellow-600 font-medium">Pending Verification</span>
                </>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {profile.is_verified
                ? `Verified on ${new Date(profile.verified_at!).toLocaleDateString()}`
                : 'Your account is pending verification. We will review your information shortly.'}
            </p>
          </div>
        )}
      </div>

      {/* Pizzeria Fields */}
      {formData.is_pizzeria && (
        <div className="border-t border-gray-200 pt-6 space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Business Information</h3>

          <div>
            <label htmlFor="business_name" className="block text-sm font-medium text-gray-700 mb-1">
              Business Name
            </label>
            <input
              type="text"
              id="business_name"
              name="business_name"
              value={formData.business_name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Your pizza place name"
            />
          </div>

          <div>
            <label htmlFor="business_address" className="block text-sm font-medium text-gray-700 mb-1">
              Street Address
            </label>
            <input
              type="text"
              id="business_address"
              name="business_address"
              value={formData.business_address}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="123 Pizza Street"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="City"
              />
            </div>
            <div>
              <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                State/Province
              </label>
              <input
                type="text"
                id="state"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="State"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                Country
              </label>
              <select
                id="country"
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="MX">Mexico</option>
                <option value="UK">United Kingdom</option>
                <option value="IT">Italy</option>
                <option value="DE">Germany</option>
                <option value="FR">France</option>
                <option value="ES">Spain</option>
                <option value="AU">Australia</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700 mb-1">
                Postal Code
              </label>
              <input
                type="text"
                id="postal_code"
                name="postal_code"
                value={formData.postal_code}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="12345"
              />
            </div>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <div>
            <label htmlFor="website_url" className="block text-sm font-medium text-gray-700 mb-1">
              Website
            </label>
            <input
              type="url"
              id="website_url"
              name="website_url"
              value={formData.website_url}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="https://yourpizzeria.com"
            />
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="border-t border-gray-200 pt-6">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white font-medium rounded-lg transition-colors"
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
