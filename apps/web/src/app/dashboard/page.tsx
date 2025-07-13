'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

export default function DashboardPage() {
  const { data: session } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (session?.user?.role) {
      // Redirect based on user role
      switch (session.user.role) {
        case 'ADMIN':
          router.push('/dashboard/admin')
          break
        case 'TEACHER':
          router.push('/dashboard/teacher')
          break
        case 'STUDENT':
          router.push('/dashboard/student')
          break
        default:
          router.push('/dashboard/student')
      }
    }
  }, [session, router])

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    </ProtectedRoute>
  )
} 