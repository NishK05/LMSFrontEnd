'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Button } from '@lms/ui'

interface Course {
  id: string
  title: string
  description: string
  isPublished: boolean
  isFree: boolean
  price?: number
  enrollments: {
    id: string
    user: {
      id: string
      name: string
      email: string
    }
    progress: number
  }[]
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

export default function TeacherDashboardPage() {
  const { data: sessionRaw } = useSession()
  const session = sessionRaw as (typeof sessionRaw & { user?: { id?: string; name?: string | null; email?: string | null; image?: string | null; role?: string } })
  const router = useRouter()
  const [teachingCourses, setTeachingCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddStudentModal, setShowAddStudentModal] = useState<string | null>(null)
  const [students, setStudents] = useState<User[]>([])
  const [selectedStudent, setSelectedStudent] = useState<string>('')
  const [enrolling, setEnrolling] = useState(false)
  const [enrollError, setEnrollError] = useState('')

  useEffect(() => {
    if (session?.user?.role !== 'TEACHER') {
      router.push('/dashboard')
      return
    }
    
    const fetchTeachingCourses = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses?instructor=${session?.user?.id}`)
        if (response.ok) {
          const data = await response.json()
          setTeachingCourses(data.data || [])
        }
      } catch (error) {
        console.error('Error fetching teaching courses:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchTeachingCourses()
  }, [session, router])

  const fetchTeachingCourses = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses?instructor=${session?.user?.id}`)
      if (response.ok) {
        const data = await response.json()
        setTeachingCourses(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching teaching courses:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStudents = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users?role=STUDENT`)
      if (response.ok) {
        const data = await response.json()
        setStudents(data.data || [])
      }
    } catch (error) {
      setStudents([])
    }
  }

  const openAddStudentModal = (courseId: string) => {
    setShowAddStudentModal(courseId)
    setSelectedStudent('')
    setEnrollError('')
    fetchStudents()
  }

  const handleEnrollStudent = async (courseId: string) => {
    if (!selectedStudent) return
    setEnrolling(true)
    setEnrollError('')
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses/${courseId}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedStudent }),
      })
      if (response.ok) {
        setShowAddStudentModal(null)
        fetchTeachingCourses()
      } else {
        const data = await response.json()
        setEnrollError(data.error || 'Failed to enroll student')
      }
    } catch (error) {
      setEnrollError('Failed to enroll student')
    } finally {
      setEnrolling(false)
    }
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' })
  }

  if (session?.user?.role !== 'TEACHER') {
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
                <h1 className="text-3xl font-bold text-gray-900">Teacher Dashboard</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Welcome, {session?.user?.name} - Manage your courses and students
                </p>
              </div>
              <Button onClick={handleSignOut} variant="outline">
                Sign Out
              </Button>
            </div>
          </div>

          {/* User Info Card */}
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Teacher Information
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-500 w-20">Name:</span>
                    <span className="text-sm text-gray-900">{session?.user?.name || 'N/A'}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-500 w-20">Email:</span>
                    <span className="text-sm text-gray-900">{session?.user?.email || 'N/A'}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-500 w-20">Role:</span>
                    <span className="text-sm text-gray-900">{session?.user?.role || 'TEACHER'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Teaching Courses */}
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">My Teaching Courses</h3>
                <p className="text-sm text-gray-600">Courses you're instructing</p>
              </div>

              {loading ? (
                <div className="px-6 py-8">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-20 bg-gray-200 rounded"></div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : teachingCourses.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <p className="text-gray-500">You're not teaching any courses yet.</p>
                  <p className="text-sm text-gray-400 mt-2">Contact an admin to be assigned to courses.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {teachingCourses.map(course => (
                    <div key={course.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h4 className="text-lg font-medium text-gray-900">{course.title}</h4>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              course.isPublished 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {course.isPublished ? 'Published' : 'Draft'}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              course.isFree 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-purple-100 text-purple-800'
                            }`}>
                              {course.isFree ? 'Free' : `$${course.price}`}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-gray-600">{course.description}</p>
                          <div className="mt-2 text-sm text-gray-500">
                            <span className="font-medium">Students enrolled:</span> {course.enrollments.length}
                          </div>
                          {/* List enrolled students */}
                          <div className="mt-2">
                            <h5 className="text-sm font-semibold text-gray-700 mb-1">Enrolled Students:</h5>
                            {course.enrollments.length === 0 ? (
                              <div className="text-xs text-gray-400">No students enrolled yet.</div>
                            ) : (
                              <ul className="text-xs text-gray-700 space-y-1">
                                {course.enrollments.map(e => (
                                  <li key={e.id}>
                                    {e.user.name} ({e.user.email})
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <Button
                            size="sm"
                            onClick={() => openAddStudentModal(course.id)}
                          >
                            Add Student
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/dashboard/teacher/courses/${course.id}`)}
                          >
                            Manage Course
                          </Button>
                        </div>
                      </div>
                      {/* Add Student Modal */}
                      {showAddStudentModal === course.id && (
                        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
                            <h4 className="text-lg font-semibold mb-4">Add Student to {course.title}</h4>
                            <div className="mb-4">
                              <label className="block text-sm font-medium text-gray-700 mb-1">Select Student</label>
                              <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={selectedStudent}
                                onChange={e => setSelectedStudent(e.target.value)}
                              >
                                <option value="">Select a student</option>
                                {students.map(student => (
                                  <option key={student.id} value={student.id}>
                                    {student.name} ({student.email})
                                  </option>
                                ))}
                              </select>
                            </div>
                            {enrollError && <div className="text-red-600 text-sm mb-2">{enrollError}</div>}
                            <div className="flex justify-end space-x-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowAddStudentModal(null)}
                                disabled={enrolling}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                onClick={() => handleEnrollStudent(course.id)}
                                disabled={enrolling || !selectedStudent}
                              >
                                {enrolling ? 'Enrolling...' : 'Enroll Student'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
} 