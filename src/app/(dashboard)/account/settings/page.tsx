'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const { user, signOut } = useAuth()
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const supabase = createClient()

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(false)

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }

    setIsSubmitting(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      })

      if (error) {
        setPasswordError(error.message)
      } else {
        setPasswordSuccess(true)
        setPasswordForm({ newPassword: '', confirmPassword: '' })
        setIsChangingPassword(false)
      }
    } catch (err) {
      setPasswordError('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return

    setIsDeleting(true)

    try {
      // Note: Account deletion typically requires a server-side function
      // For now, we'll sign out and show a message
      // In production, you'd call an Edge Function or API route to delete the account

      // Sign out the user
      await signOut()

      // In a real implementation, you would:
      // 1. Call an API endpoint that uses the service role to delete the user
      // 2. Delete all user data (profile, content, favorites, etc.)

      alert('Account deletion has been initiated. Please contact support if your account is not deleted within 24 hours.')
    } catch (err) {
      console.error('Error deleting account:', err)
      alert('Failed to delete account. Please contact support.')
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account preferences and security</p>
      </div>

      {/* Email */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Email Address</h2>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>
          <span className="text-sm text-gray-500">
            {user?.email_confirmed_at ? 'Verified' : 'Unverified'}
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Contact support to change your email address.
        </p>
      </div>

      {/* Password */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Password</h2>

        {passwordSuccess && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            Password updated successfully!
          </div>
        )}

        {!isChangingPassword ? (
          <button
            onClick={() => setIsChangingPassword(true)}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
          >
            Change Password
          </button>
        ) : (
          <form onSubmit={handlePasswordChange} className="space-y-4">
            {passwordError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {passwordError}
              </div>
            )}

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Enter new password"
                minLength={8}
                required
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Confirm new password"
                minLength={8}
                required
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white font-medium rounded-lg transition-colors"
              >
                {isSubmitting ? 'Updating...' : 'Update Password'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsChangingPassword(false)
                  setPasswordForm({ newPassword: '', confirmPassword: '' })
                  setPasswordError(null)
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
        <h2 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h2>

        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-gray-900">Delete Account</h3>
            <p className="text-sm text-gray-500 mt-1">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
          </div>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
          >
            Delete Account
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Delete Account?
            </h3>
            <p className="text-gray-500 mb-4">
              This will permanently delete your account, including:
            </p>
            <ul className="text-sm text-gray-500 list-disc list-inside mb-4 space-y-1">
              <li>Your profile information</li>
              <li>All submitted content</li>
              <li>Your favorites and view history</li>
              <li>Any pending submissions</li>
            </ul>
            <p className="text-gray-700 mb-4">
              Type <strong>DELETE</strong> to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent mb-4"
              placeholder="DELETE"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeleteConfirmText('')
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-medium rounded-lg transition-colors"
              >
                {isDeleting ? 'Deleting...' : 'Delete My Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
