'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { FileManager } from '@/components/files/FileManager'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { Button } from '@lms/ui'
import { BookOpen, User2, Clock, Play, CheckCircle, Paperclip, Trash2 } from 'lucide-react'
import { getSections } from '../../gradebook/api' // Import the gradebook API for fetching sections
import AssignmentForm from '../../gradebook/Teacher/AssignmentForm'
import { saveAssignment, deleteAssignment } from '../../gradebook/api'
import FileUpload from '@/components/files/FileUpload'

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
  const [assignments, setAssignments] = useState<any[]>([])
  const [sections, setSections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({
    id: '',
    name: '',
    dueDate: '',
    dueTime: '',
    sectionId: '',
    comment: '',
    points: 100,
  })
  const [createError, setCreateError] = useState('')
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [createFiles, setCreateFiles] = useState<any[]>([])

  useEffect(() => {
    // Fetch course details (excluding assignments)
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
      }
    }

    // Fetch assignments for this course from the gradebook API (single source of truth)
    const fetchAssignments = async () => {
      try {
        const response = await fetch(`/api/gradebook/${params.id}/assignments`)
        const data = await response.json()
        if (data.success && Array.isArray(data.data)) {
          setAssignments(data.data)
        } else {
          setAssignments([])
        }
      } catch (error) {
        setAssignments([])
      }
    }

    // Fetch grade sections for this course
    const fetchSections = async () => {
      try {
        const data = await getSections(params.id)
        setSections(data)
      } catch (error) {
        setSections([])
      }
    }

    setLoading(true)
    Promise.all([fetchCourse(), fetchAssignments(), fetchSections()]).finally(() => setLoading(false))
  }, [params.id])

  const handleCreate = async () => {
    if (!createForm.name.trim() || !createForm.dueDate || !createForm.sectionId) {
      setCreateError('Name, due date, and section are required')
      return
    }
    setCreateError('')
    setCreating(true)
    const dueDateTime = createForm.dueTime ? `${createForm.dueDate}T${createForm.dueTime}:00` : createForm.dueDate
    try {
      const saved = await saveAssignment(params.id, {
        name: createForm.name,
        dueDate: dueDateTime,
        sectionId: createForm.sectionId,
        description: createForm.comment,
        maxScore: createForm.points,
        type: 'STANDARD',
      })
      setAssignments([...assignments, saved])
      setShowCreateModal(false)
      setCreateForm({ id: '', name: '', dueDate: '', dueTime: '', sectionId: '', comment: '', points: 100 })
    } catch (e: any) {
      setCreateError(e.message || 'Failed to create assignment')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (assignmentId: string) => {
    setDeletingId(assignmentId)
    setDeleteError('')
    try {
      await deleteAssignment(params.id, assignmentId)
      setAssignments(assignments.filter(a => a.id !== assignmentId))
    } catch (e: any) {
      setDeleteError(e.message || 'Failed to delete assignment')
    } finally {
      setDeletingId(null)
    }
  }

  // Helper to get section name by sectionId
  const getSectionName = (sectionId: string) => {
    const section = sections.find((s: any) => s.id === sectionId)
    return section ? section.name : 'Uncategorized'
  }

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

  const isEnrolled = course.enrollments.some(enrollment => enrollment.user.id === session?.user?.id)
  const isInstructor = course.instructorId === session?.user?.id
  const isTeacher = session?.user?.role === 'TEACHER'
  const isAdmin = session?.user?.role === 'ADMIN'

  // Determine FileManager mode
  const getFileManagerMode = () => {
    if (isAdmin || isInstructor || isTeacher) {
      return 'teacher'
    }
    return 'student'
  }

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
                    <span>Instructor: {course.instructor.name} (<span className="text-purple-700">{course.instructor.email}</span>)</span>
                    <span
                      className="ml-4 px-2 py-1 bg-purple-100 text-purple-700 rounded cursor-pointer hover:bg-purple-200"
                      onClick={() => router.push(`/courses/${course.id}/students`)}
                    >
                      Students Enrolled: {course.enrollments.length}
                    </span>
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
            
            {!isEnrolled && !isInstructor && !isTeacher && (
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
            
            {(isInstructor || isTeacher) && (
              <div className="flex gap-3">
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Manage Course
                </Button>
                <Button variant="outline">
                  View as Student
                </Button>
              </div>
            )}
          </div>

          {/* Main Content: Files + Assignments Side Panel */}
          <div className="flex flex-row gap-6 mb-6">
            {/* Files Section */}
            <div className="flex-1">
              <div className="bg-white/80 rounded-2xl shadow-lg border border-purple-100 p-6">
                <h2 className="text-xl font-semibold text-purple-900 mb-4">Files</h2>
                <FileManager
                  mode={getFileManagerMode()}
                  courseId={params.id}
                  userId={session?.user?.id || ''}
                  userRole={session?.user?.role || 'STUDENT'}
                />
              </div>
            </div>
            {/* Assignments Side Panel */}
            <div className="w-full max-w-sm">
              <div className="bg-white/80 rounded-2xl shadow-lg border border-purple-100 p-6">
                <h2 className="text-xl font-semibold text-purple-900 mb-4 flex items-center justify-between">
                  Assignments
                  {(isInstructor || isTeacher || isAdmin) && (
                    <Button className="ml-2" onClick={() => setShowCreateModal(true)}>
                      + Create Assignment
                    </Button>
                  )}
                </h2>
                {/*
                  Assignments are fetched directly from /api/gradebook/:courseId/assignments
                  This ensures the assignments list is always in sync with the gradebook and backend database.
                  No duplication or stale cache risk.
                  Assignment category is shown using the section name (fetched from gradebook sections).
                  File attachment indicator is a placeholder (no file-assignment link in schema yet).
                  All assignments are shown (no published filtering, as schema lacks status field).
                */}
                {assignments.length > 0 ? (
                  <ul className="space-y-4">
                    {assignments.map((assignment: any) => (
                      <li
                        key={assignment.id}
                        className="border-b border-purple-50 pb-2 cursor-pointer hover:bg-purple-50 transition select-none rounded flex items-center"
                        onClick={e => {
                          // Only navigate if not clicking the delete button
                          if ((e.target as HTMLElement).closest('.delete-btn')) return
                          router.push(`/courses/${params.id}/assignments/${assignment.id}`)
                        }}
                        tabIndex={0}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') router.push(`/courses/${params.id}/assignments/${assignment.id}`) }}
                        role="button"
                        aria-label={`Open assignment ${assignment.name || assignment.title}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-purple-900">{assignment.name || assignment.title}</div>
                            {/* Placeholder for file attachment indicator */}
                            <span title="No files attached">
                              <Paperclip className="w-4 h-4 text-purple-300" />
                            </span>
                          </div>
                          <div className="text-xs text-purple-500 mb-1">
                            Category: {getSectionName(assignment.sectionId)}
                          </div>
                          <div className="text-sm text-purple-600">{assignment.description}</div>
                          <div className="text-xs text-purple-400 mt-1">
                            Due: {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'N/A'}
                          </div>
                        </div>
                        {(isInstructor || isTeacher || isAdmin) && (
                          <button
                            className="delete-btn ml-2 text-red-500 hover:text-red-700 p-1 rounded"
                            title="Delete assignment"
                            onClick={e => { e.stopPropagation(); handleDelete(assignment.id) }}
                            disabled={deletingId === assignment.id}
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-purple-400">No assignments yet.</div>
                )}
                {deleteError && <div className="text-red-600 mt-2">{deleteError}</div>}
              </div>
            </div>
          </div>
        </div>
        {/* Modal for creating assignment */}
        {showCreateModal && (
          (isInstructor || isTeacher || isAdmin) && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
              <div className="bg-white rounded-xl shadow-lg p-6 min-w-[350px] max-w-[90vw]">
                <h3 className="text-lg font-bold mb-2">Create Assignment</h3>
                <AssignmentForm
                  form={createForm}
                  setForm={setCreateForm}
                  sections={sections}
                  editing={false}
                  onSave={handleCreate}
                  onCancel={() => { setShowCreateModal(false); setCreateError('') }}
                  error={createError}
                  loading={creating}
                />
                <div className="mt-4">
                  <h4 className="font-semibold mb-1">Files</h4>
                  <FileUpload
                    courseId={params.id}
                    userId={session?.user?.id || ''}
                    onUpload={files => setCreateFiles(files)}
                  />
                  {createFiles.length > 0 && (
                    <div className="text-xs text-purple-600 mt-2">
                      Files uploaded! They will appear in the course files section. (Assignment-file linking coming soon.)
                    </div>
                  )}
                </div>
                <div className="flex justify-end mt-2">
                  <Button variant="outline" onClick={() => { setShowCreateModal(false); setCreateError('') }}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )
        )}
      </DashboardLayout>
    </ProtectedRoute>
  )
} 