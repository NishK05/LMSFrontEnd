'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Button } from '@lms/ui'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { BookOpen, User2 } from 'lucide-react'

interface Course {
  id: string
  title: string
  description: string
  instructor: {
    name: string
    email: string
  }
  progress: number
}

interface Assignment {
  id: string
  title: string
  description: string
  dueDate: string // ISO string
  courseTitle: string
}

// Remove mock assignments - we'll fetch from backend
// const mockAssignments: Assignment[] = [...]

function groupAssignmentsByDate(assignments: Assignment[]) {
  const groups: { [date: string]: Assignment[] } = {}
  assignments.forEach(a => {
    const date = new Date(a.dueDate).toLocaleDateString()
    if (!groups[date]) groups[date] = []
    groups[date].push(a)
  })
  return groups
}

export default function StudentDashboardPage() {
  const { data: sessionRaw } = useSession()
  const session = sessionRaw as (typeof sessionRaw & { user?: { id?: string; name?: string | null; email?: string | null; image?: string | null; role?: string } })
  const router = useRouter()
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user?.role !== 'STUDENT') {
      return
    }
    
    const fetchEnrolledCourses = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/enrollments?userId=${session?.user?.id}`)
        if (response.ok) {
          const data = await response.json()
          setEnrolledCourses(data.data || [])
        }
      } catch (error) {
        console.error('Error fetching enrollments:', error)
      } finally {
        setLoading(false)
      }
    }

    const fetchAssignments = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/assignments?userId=${session?.user?.id}`)
        if (response.ok) {
          const data = await response.json()
          setAssignments(data.data || [])
        }
      } catch (error) {
        console.error('Error fetching assignments:', error)
        // Fallback to empty array if endpoint doesn't exist yet
        setAssignments([])
      }
    }
    
    fetchEnrolledCourses()
    fetchAssignments()
  }, [session, router])

  // Group assignments by due date
  const groupedAssignments = groupAssignmentsByDate(assignments)

  if (session?.user?.role !== 'STUDENT') {
    return null
  }

  return (
    <ProtectedRoute>
      <DashboardLayout
        rightSidebar={
          <div className="space-y-6">
            <div className="text-lg font-semibold text-purple-800 mb-2">To Do's</div>
            {Object.entries(groupedAssignments).map(([date, assignments]) => (
              <div key={date}>
                <div className="text-xs font-bold text-purple-600 mb-1">Due {date}</div>
                <div className="space-y-3">
                  {assignments.map(a => (
                    <div
                      key={a.id}
                      className="rounded-xl bg-white/80 shadow-md px-4 py-3 flex items-center gap-3 border border-purple-100 hover:shadow-lg transition-all"
                    >
                      <BookOpen className="w-5 h-5 text-purple-400" />
                      <div className="flex-1">
                        <div className="font-medium text-sm text-purple-900">{a.title}</div>
                        <div className="text-xs text-purple-500">{a.courseTitle}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        }
      >
        <div className="flex flex-col h-full">
          <div className="text-lg font-semibold text-purple-800 mb-4">My Courses</div>
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400"></div>
            </div>
          ) : enrolledCourses.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <p className="text-purple-400">You haven't enrolled in any courses yet.</p>
              <Button className="mt-4" onClick={() => router.push('/courses')}>
                Browse Courses
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 overflow-y-auto pr-2" style={{ maxHeight: '70vh' }}>
              {enrolledCourses.map(course => (
                <div
                  key={course.id}
                  className="rounded-2xl bg-white/80 shadow-lg border border-purple-100 p-6 flex flex-col justify-between cursor-pointer hover:scale-[1.02] hover:shadow-xl transition-all min-h-[140px]"
                  onClick={() => router.push(`/courses/${course.id}`)}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <User2 className="w-5 h-5 text-purple-400" />
                    <div className="text-base font-bold text-purple-900">{course.title}</div>
                  </div>
                  <div className="text-xs text-purple-500 mb-1">{course.description}</div>
                  <div className="text-xs text-purple-600 mt-auto">Instructor: {course.instructor.name}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
} 