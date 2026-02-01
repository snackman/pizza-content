'use client'

import { useRouter } from 'next/navigation'
import { ProfileEditor } from '@/components/dashboard/ProfileEditor'

export default function EditProfilePage() {
  const router = useRouter()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Profile</h1>
        <p className="text-gray-500 mt-1">Update your personal information and preferences</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <ProfileEditor
          onSuccess={() => {
            // Stay on page - success message is shown in the form
          }}
        />
      </div>
    </div>
  )
}
