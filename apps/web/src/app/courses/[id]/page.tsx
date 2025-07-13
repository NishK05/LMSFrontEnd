'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { Button } from '@lms/ui'
import { BookOpen, User2, Clock, Play, CheckCircle } from 'lucide-react'

interface Lesson {
  id: string
  title: string
  description: string | null
  content: string
  order: number
  isPublished: boolean
  createdAt: string
  updatedAt: string
}

interface Course {
  id: string
  title: string
  description: string
  slug: string
  image: string | null
  instructorId: string
  instructor: {
    id: string
    name: string
    email: string
  }
  isPublished: boolean
  isFree: boolean
  price: number | null
  createdAt: string
  updatedAt: string
  lessons: Lesson[]
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

export default function CourseSplashPage({ params }: { params: { id: string } }) {
  const { data: sessionRaw } = useSession()
  const session = sessionRaw as (typeof sessionRaw & { user?: { id?: string; name?: string | null; email?: string | null; image?: string | null; role?: string } })
  const router = useRouter()
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses/${params.id}`)
        if (response.ok) {
          const data = await response.json()
          setCourse(data.data)
        } else {
          setError('Course not found')
        }
      } catch (error) {
        setError('Failed to load course')
      } finally {
        setLoading(false)
      }
    }

    fetchCourse()
  }, [params.id])

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400"></div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  if (error || !course) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <p className="text-purple-400 mb-4">{error || 'Course not found'}</p>
            <Button onClick={() => router.push('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  const publishedLessons = course.lessons.filter(lesson => lesson.isPublished)
  const isEnrolled = course.enrollments.some(enrollment => enrollment.user.id === session?.user?.id)

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="flex flex-col h-full">
          {/* Course Header */}
          <div className="bg-white/80 rounded-2xl shadow-lg border border-purple-100 p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-purple-900 mb-2">{course.title}</h1>
                <p className="text-purple-600 mb-4">{course.description}</p>
                <div className="flex items-center gap-6 text-sm text-purple-500">
                  <div className="flex items-center gap-2">
                    <User2 className="w-4 h-4" />
                    <span>Instructor: {course.instructor.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    <span>{publishedLessons.length} Lessons</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>Created {new Date(course.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  course.isPublished 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {course.isPublished ? 'Published' : 'Draft'}
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  course.isFree 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-purple-100 text-purple-800'
                }`}>
                  {course.isFree ? 'Free' : `$${course.price}`}
                </div>
              </div>
            </div>
            
            {!isEnrolled && (
              <div className="flex gap-3">
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <Play className="w-4 h-4 mr-2" />
                  Start Learning
                </Button>
                <Button variant="outline">
                  Preview Course
                </Button>
              </div>
            )}
          </div>

          {/* Course Content */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lessons List */}
            <div className="lg:col-span-2">
              <div className="bg-white/80 rounded-2xl shadow-lg border border-purple-100 p-6">
                <h2 className="text-xl font-semibold text-purple-900 mb-4">Course Content</h2>
                {publishedLessons.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="w-12 h-12 text-purple-300 mx-auto mb-4" />
                    <p className="text-purple-500">No lessons available yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {publishedLessons
                      .sort((a, b) => a.order - b.order)
                      .map((lesson, index) => (
                        <div
                          key={lesson.id}
                          className="flex items-center gap-4 p-4 rounded-xl bg-purple-50/50 border border-purple-100 hover:bg-purple-50 transition-colors cursor-pointer"
                          onClick={() => router.push(`/courses/${course.id}/lessons/${lesson.id}`)}
                        >
                          <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-purple-700">{index + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-purple-900 truncate">{lesson.title}</h3>
                            {lesson.description && (
                              <p className="text-sm text-purple-600 truncate">{lesson.description}</p>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            <Play className="w-5 h-5 text-purple-400" />
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Course Info Sidebar */}
            <div className="space-y-6">
              {/* Instructor Info */}
              <div className="bg-white/80 rounded-2xl shadow-lg border border-purple-100 p-6">
                <h3 className="text-lg font-semibold text-purple-900 mb-4">Instructor</h3>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <User2 className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-purple-900">{course.instructor.name}</p>
                    <p className="text-sm text-purple-600">{course.instructor.email}</p>
                  </div>
                </div>
              </div>

              {/* Course Stats */}
              <div className="bg-white/80 rounded-2xl shadow-lg border border-purple-100 p-6">
                <h3 className="text-lg font-semibold text-purple-900 mb-4">Course Overview</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-purple-600">Total Lessons:</span>
                    <span className="font-medium text-purple-900">{publishedLessons.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-600">Students Enrolled:</span>
                    <span className="font-medium text-purple-900">{course.enrollments.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-600">Course Type:</span>
                    <span className="font-medium text-purple-900">
                      {course.isFree ? 'Free' : 'Paid'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-600">Status:</span>
                    <span className="font-medium text-purple-900">
                      {course.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress (if enrolled) */}
              {isEnrolled && (
                <div className="bg-white/80 rounded-2xl shadow-lg border border-purple-100 p-6">
                  <h3 className="text-lg font-semibold text-purple-900 mb-4">Your Progress</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-purple-600">Progress:</span>
                      <span className="font-medium text-purple-900">
                        {course.enrollments.find(e => e.user.id === session?.user?.id)?.progress || 0}%
                      </span>
                    </div>
                    <div className="w-full bg-purple-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${course.enrollments.find(e => e.user.id === session?.user?.id)?.progress || 0}%` 
                        }}
                      ></div>
                    </div>
                    <Button className="w-full bg-purple-600 hover:bg-purple-700">
                      <Play className="w-4 h-4 mr-2" />
                      Continue Learning
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
} 