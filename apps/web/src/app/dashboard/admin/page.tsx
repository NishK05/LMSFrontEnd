'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Button } from '@lms/ui'
import { CourseForm } from '@/components/admin/CourseForm'
import { CourseList } from '../../../components/admin/CourseList'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'

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
      <DashboardLayout>
        <div className="flex flex-col h-full">
          {/* Course Management Section */}
          <div className="bg-white/80 rounded-2xl shadow-lg border border-purple-100 p-6">
            <h2 className="text-xl font-semibold text-purple-900 mb-4">Course Management</h2>
            <div className="flex justify-end mb-4">
              <Button onClick={() => setShowCourseForm(true)}>
                Add New Course
              </Button>
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
            <CourseList 
              courses={courses} 
              loading={loading}
              onCourseUpdated={fetchCourses}
            />
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
} 