'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { Button } from '@lms/ui'
import { User2, Mail, Shield, Hash, LogOut } from 'lucide-react'

export default function SettingsPage() {
  const { data: sessionRaw } = useSession()
  const session = sessionRaw as (typeof sessionRaw & { user?: { id?: string; name?: string | null; email?: string | null; image?: string | null; role?: string } })
  const router = useRouter()

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' })
  }

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'Administrator'
      case 'TEACHER':
        return 'Teacher'
      case 'STUDENT':
        return 'Student'
      default:
        return role
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800'
      case 'TEACHER':
        return 'bg-blue-100 text-blue-800'
      case 'STUDENT':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-purple-900">Settings</h1>
            <p className="text-purple-600 mt-2">Manage your account and preferences</p>
          </div>

          {/* User Information Card */}
          <div className="bg-white/80 rounded-2xl shadow-lg border border-purple-100 p-6 mb-6">
            <h2 className="text-xl font-semibold text-purple-900 mb-4">Account Information</h2>
            
            <div className="space-y-4">
              {/* Name */}
              <div className="flex items-center gap-4 p-4 bg-purple-50/50 rounded-xl border border-purple-100">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <User2 className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-purple-500 font-medium">Name</div>
                  <div className="text-purple-900 font-semibold">
                    {session?.user?.name || 'Not provided'}
                  </div>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center gap-4 p-4 bg-purple-50/50 rounded-xl border border-purple-100">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Mail className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-purple-500 font-medium">Email</div>
                  <div className="text-purple-900 font-semibold">
                    {session?.user?.email || 'Not provided'}
                  </div>
                </div>
              </div>

              {/* User ID */}
              <div className="flex items-center gap-4 p-4 bg-purple-50/50 rounded-xl border border-purple-100">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Hash className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-purple-500 font-medium">User ID</div>
                  <div className="text-purple-900 font-mono text-sm">
                    {session?.user?.id || 'Not available'}
                  </div>
                </div>
              </div>

              {/* Role */}
              <div className="flex items-center gap-4 p-4 bg-purple-50/50 rounded-xl border border-purple-100">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-purple-500 font-medium">Role</div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(session?.user?.role || 'STUDENT')}`}>
                      {getRoleDisplayName(session?.user?.role || 'STUDENT')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Account Actions */}
          <div className="bg-white/80 rounded-2xl shadow-lg border border-purple-100 p-6">
            <h2 className="text-xl font-semibold text-purple-900 mb-4">Account Actions</h2>
            
            <div className="space-y-4">
              {/* Sign Out Button */}
              <div className="flex items-center gap-4 p-4 bg-red-50/50 rounded-xl border border-red-100">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <LogOut className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-red-600 font-medium">Sign Out</div>
                  <div className="text-red-700 text-sm">
                    Sign out of your account and return to the login page
                  </div>
                </div>
                <Button 
                  variant="destructive" 
                  onClick={handleSignOut}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>

              {/* Back to Dashboard */}
              <div className="flex items-center gap-4 p-4 bg-purple-50/50 rounded-xl border border-purple-100">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <User2 className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-purple-600 font-medium">Dashboard</div>
                  <div className="text-purple-700 text-sm">
                    Return to your main dashboard
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/dashboard')}
                  className="border-purple-200 text-purple-700 hover:bg-purple-50"
                >
                  Go to Dashboard
                </Button>
              </div>
            </div>
          </div>

          {/* Additional Settings (Placeholder for future features) */}
          <div className="bg-white/80 rounded-2xl shadow-lg border border-purple-100 p-6 mt-6">
            <h2 className="text-xl font-semibold text-purple-900 mb-4">Additional Settings</h2>
            <div className="text-center py-8">
              <div className="text-purple-400 text-sm">
                More settings options will be available soon
              </div>
              <div className="text-purple-300 text-xs mt-2">
                Profile picture, notification preferences, privacy settings, etc.
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
} 