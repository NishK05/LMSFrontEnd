'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Button } from '@lms/ui'
import { CourseForm } from '@/components/admin/CourseForm'
import { CourseList } from '../../../components/admin/CourseList'

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface Course {
  id: string
  title: string
  description: string
  instructor: {
    id: string
    name: string
    email: string
  }
  isPublished: boolean
  isFree: boolean
  price?: number
  createdAt: string
}

export default function AdminDashboardPage() {
  const { data: sessionRaw, status } = useSession()
  const session = sessionRaw as (typeof sessionRaw & { user?: { id?: string; name?: string | null; email?: string | null; image?: string | null; role?: string } })
  const router = useRouter()
  const [showCourseForm, setShowCourseForm] = useState(false)
  const [courses, setCourses] = useState<Course[]>([])
  const [teachers, setTeachers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return // Wait for session to load

    if (!session || !session.user || session.user.role !== 'ADMIN') {
      router.push('/dashboard')
      return
    }

    fetchCourses()
    fetchTeachers()
  }, [session, status, router])

  const fetchCourses = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses`)
      if (response.ok) {
        const data = await response.json()
        setCourses(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching courses:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTeachers = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users?role=TEACHER`)
      if (response.ok) {
        const data = await response.json()
        setTeachers(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching teachers:', error)
    }
  }

  const handleCourseCreated = () => {
    setShowCourseForm(false)
    fetchCourses()
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' })
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!session || !session.user || session.user.role !== 'ADMIN') {
    return null
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="px-4 py-6 sm:px-0">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Welcome, {session.user.name} - Manage courses and users
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Button onClick={() => setShowCourseForm(true)}>
                  Add New Course
                </Button>
                <Button onClick={handleSignOut} variant="outline">
                  Sign Out
                </Button>
              </div>
            </div>
          </div>

          {/* Course Form Modal */}
          {showCourseForm && (
            <CourseForm
              teachers={teachers}
              onClose={() => setShowCourseForm(false)}
              onCourseCreated={handleCourseCreated}
            />
          )}

          {/* Course List */}
          <div className="px-4 py-6 sm:px-0">
            <CourseList 
              courses={courses} 
              loading={loading}
              onCourseUpdated={fetchCourses}
            />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
} 