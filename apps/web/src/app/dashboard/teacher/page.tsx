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
      <DashboardLayout>
        <div className="flex flex-col h-full">
          {/* Teaching Courses */}
          <div className="bg-white/80 rounded-2xl shadow-lg border border-purple-100 p-6">
            <h2 className="text-xl font-semibold text-purple-900 mb-4">My Teaching Courses</h2>
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400"></div>
              </div>
            ) : teachingCourses.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-purple-400">You're not teaching any courses yet.</p>
                <p className="text-sm text-purple-300 mt-2">Contact an admin to be assigned to courses.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {teachingCourses.map(course => (
                  <div key={course.id} className="rounded-2xl bg-white/80 shadow-lg border border-purple-100 p-6 flex flex-col justify-between min-h-[140px]">
                    <div className="flex items-center gap-3 mb-2">
                      <BookOpen className="w-5 h-5 text-purple-400" />
                      <div className="text-base font-bold text-purple-900">{course.title}</div>
                      <span className={`px-2 py-1 text-xs rounded-full ${course.isPublished ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{course.isPublished ? 'Published' : 'Draft'}</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${course.isFree ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>{course.isFree ? 'Free' : `$${course.price}`}</span>
                    </div>
                    <div className="text-xs text-purple-500 mb-1">{course.description}</div>
                    <div className="text-xs text-purple-600 mt-auto">Students enrolled: {course.enrollments.length}</div>
                    <div className="flex flex-row gap-2 mt-4">
                      <Button size="sm" onClick={() => openAddStudentModal(course.id)}>Add Student</Button>
                      <Button size="sm" variant="outline" onClick={() => router.push(`/courses/${course.id}`)}>Manage Course</Button>
                    </div>
                    {/* Enrolled Students List */}
                    <div className="mt-2">
                      <h5 className="text-sm font-semibold text-purple-700 mb-1">Enrolled Students:</h5>
                      {course.enrollments.length === 0 ? (
                        <div className="text-xs text-purple-400">No students enrolled yet.</div>
                      ) : (
                        <ul className="text-xs text-purple-700 space-y-1">
                          {course.enrollments.map(e => (
                            <li key={e.id}>{e.user.name} ({e.user.email})</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {/* Add Student Modal */}
                    {showAddStudentModal === course.id && (
                      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 w-full max-w-sm">
                          <h4 className="text-lg font-semibold mb-4">Add Student to {course.title}</h4>
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Select Student</label>
                            <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}>
                              <option value="">Select a student</option>
                              {students.map(student => (
                                <option key={student.id} value={student.id}>{student.name} ({student.email})</option>
                              ))}
                            </select>
                          </div>
                          {enrollError && <div className="text-red-600 text-sm mb-2">{enrollError}</div>}
                          <div className="flex justify-end space-x-2">
                            <Button type="button" variant="outline" onClick={() => setShowAddStudentModal(null)} disabled={enrolling}>Cancel</Button>
                            <Button type="button" onClick={() => handleEnrollStudent(course.id)} disabled={enrolling || !selectedStudent}>{enrolling ? 'Enrolling...' : 'Enroll Student'}</Button>
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
      </DashboardLayout>
    </ProtectedRoute>
  )
} 