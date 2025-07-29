"use client"

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { Button } from '@lms/ui'
import { getSections } from '../../../../gradebook/api'
import { saveAssignment } from '../../../../gradebook/api'
import AssignmentForm from '../../../../gradebook/Teacher/AssignmentForm'
import FileUpload from '@/components/files/FileUpload'
import AssignmentViewerModal from '@/components/assignments/AssignmentViewerModal'
import { Trash2, Edit } from 'lucide-react'

interface Student {
  id: string
  name: string
}

interface Grade {
  id: string
  assignmentId: string
  studentId: string
  score: number
  status: string
  comment?: string
  isPublished: boolean
}

interface Submission {
  id: string
  assignmentId: string
  studentId: string
  order: number
  status: string
  createdAt: string
  file: {
    id: string
    filename: string
  }
}

// Student Grade Display Component
function StudentGradeDisplay({ 
  assignmentId, 
  studentId, 
  courseId, 
  assignment 
}: { 
  assignmentId: string
  studentId: string
  courseId: string
  assignment: any
}) {
  const [grade, setGrade] = useState<Grade | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchGrade = async () => {
      try {
        const res = await fetch(`/api/gradebook/${courseId}/grades?role=STUDENT`)
        const data = await res.json()
        if (data.success && data.data) {
          const studentGrade = data.data.find((g: Grade) => 
            g.assignmentId === assignmentId && g.studentId === studentId
          )
          setGrade(studentGrade || null)
        }
      } catch (error) {
        console.error('Failed to fetch grade:', error)
      } finally {
        setLoading(false)
      }
    }

    if (assignmentId && studentId && courseId) {
      fetchGrade()
    }
  }, [assignmentId, studentId, courseId])

  if (loading) {
    return <div className="text-gray-500">Loading grade...</div>
  }

  if (!grade) {
    return (
      <div className="text-gray-500 italic">
        No Grades Released
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Score
        </label>
        <div className="text-lg font-semibold text-purple-700">
          {grade.score} / {assignment?.maxScore || 100}
        </div>
        <div className="text-sm text-gray-500">
          {assignment?.maxScore ? Math.round((grade.score / assignment.maxScore) * 100) : 0}%
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Status
        </label>
        <span className={`px-2 py-1 rounded text-xs ${
          grade.status === 'LATE' 
            ? 'bg-red-100 text-red-700' 
            : 'bg-green-100 text-green-700'
        }`}>
          {grade.status === 'LATE' ? 'Late' : 'On Time'}
        </span>
      </div>

      {grade.comment && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Feedback
          </label>
          <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
            {grade.comment}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AssignmentSplashPage({ params }: { params: { id: string; assignmentId: string } }) {
  const { data: sessionRaw } = useSession()
  const session = sessionRaw as (typeof sessionRaw & { user?: { id?: string; name?: string | null; email?: string | null; image?: string | null; role?: string } })
  const router = useRouter()
  const [course, setCourse] = useState<any>(null)
  const [assignment, setAssignment] = useState<any>(null)
  const [sections, setSections] = useState<any[]>([])
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<any>(null)
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingFile, setEditingFile] = useState<any>(null)
  const [studentSubmission, setStudentSubmission] = useState<any>(null)
  const [studentSubmissions, setStudentSubmissions] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [showSubmissionModal, setShowSubmissionModal] = useState(false)
  const [activeStudentTab, setActiveStudentTab] = useState<'grades' | 'history'>('grades')
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Teacher-specific state
  const [students, setStudents] = useState<Student[]>([])
  const [grades, setGrades] = useState<Grade[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [inputMode, setInputMode] = useState<'raw' | 'percent'>('raw')
  const [showAssignmentModal, setShowAssignmentModal] = useState<{ studentId: string, studentName: string } | null>(null)
  const [gradeSaving, setGradeSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [publishSuccess, setPublishSuccess] = useState(false)
  const prevGradesRef = useRef<Grade[]>([])

  const isTeacher = session?.user?.role === 'TEACHER' || course?.instructorId === session?.user?.id
  const isAdmin = session?.user?.role === 'ADMIN'

  // Fetch teacher data
  const fetchTeacherData = async () => {
    if (!isTeacher && !isAdmin) return
    
    try {
      const [studentsRes, gradesRes, submissionsRes] = await Promise.all([
        fetch(`/api/gradebook/${params.id}/students`),
        fetch(`/api/gradebook/${params.id}/grades`),
        fetch(`/api/assignments/${params.assignmentId}/submissions`)
      ])
      
      const studentsData = await studentsRes.json()
      const gradesData = await gradesRes.json()
      const submissionsData = await submissionsRes.json()
      
      setStudents(studentsData.data || [])
      setGrades(gradesData.data || [])
      setSubmissions(submissionsData.data || [])
    } catch (err) {
      console.error('Failed to fetch teacher data:', err)
    }
  }

  useEffect(() => {
    // Fetch course, assignment, sections, and files
    const fetchAll = async () => {
      setLoading(true)
      try {
        const [courseRes, assignmentRes, sectionsData, filesRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses/${params.id}`),
          fetch(`/api/gradebook/${params.id}/assignments`),
          getSections(params.id),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/files/course/${params.id}`),
        ])
        const courseData = await courseRes.json()
        setCourse(courseData.data)
        const assignmentsData = await assignmentRes.json()
        const found = assignmentsData.data?.find((a: any) => a.id === params.assignmentId)
        setAssignment(found)
        setForm(found ? {
          id: found.id,
          name: found.name,
          dueDate: found.dueDate?.split('T')[0] || '',
          dueTime: found.dueDate?.includes('T') ? found.dueDate.split('T')[1].slice(0,5) : '',
          sectionId: found.sectionId,
          comment: found.description || '',
          points: found.maxScore || 100,
        } : null)
        setSections(sectionsData)
        const filesData = await filesRes.json()
        setFiles(filesData.data?.files || [])
      } catch (e) {
        setError('Failed to load assignment')
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [params.id, params.assignmentId])

  // Fetch teacher data when assignment loads
  useEffect(() => {
    if (assignment && (isTeacher || isAdmin)) {
      fetchTeacherData()
    }
  }, [assignment, isTeacher, isAdmin])

  // Grade change handlers
  const handleGradeChange = (studentId: string, value: number | '') => {
    setGrades(gs => {
      const idx = gs.findIndex(g => g.assignmentId === params.assignmentId && g.studentId === studentId)
      if (value === '' || value === null || isNaN(Number(value))) {
        // Remove grade if blank
        if (idx !== -1) {
          return gs.filter((g, i) => i !== idx)
        }
        return gs
      }
      let newScore = value
      if (inputMode === 'percent' && assignment?.maxScore) {
        newScore = Math.round((Number(value) / 100) * assignment.maxScore)
      }
      if (idx === -1) {
        // Create new grade
        const newGrade = {
          id: '',
          assignmentId: params.assignmentId,
          studentId,
          score: newScore,
          status: 'ON_TIME' as any,
          comment: '',
          isPublished: false,
          createdAt: '',
          updatedAt: '',
        }
        return [...gs, newGrade]
      } else {
        return gs.map((g, i) => i === idx ? { ...g, score: newScore } : g)
      }
    })
  }

  const getGradeValue = (grade: Grade) => {
    if (inputMode === 'percent' && assignment?.maxScore) {
      return Math.round((grade.score / assignment.maxScore) * 100)
    } else {
      return grade.score
    }
  }

  const handleSaveGrades = async () => {
    setGradeSaving(true)
    setSaveSuccess(false)
    setPublishSuccess(false)
    try {
      const assignmentGrades = grades.filter(g => g.assignmentId === params.assignmentId)
      const res = await fetch(`/api/gradebook/${params.id}/grades/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grades: assignmentGrades }),
      })
      const data = await res.json()
      if (data.success) {
        setSaveSuccess(true)
        // Update the grades state with the returned data
        const savedGrades = data.data
        setGrades(gs => {
          const updated = [...gs]
          savedGrades.forEach((savedGrade: any) => {
            const idx = updated.findIndex(g => g.assignmentId === savedGrade.assignmentId && g.studentId === savedGrade.studentId)
            if (idx !== -1) {
              updated[idx] = savedGrade
            }
          })
          return updated
        })
        // Update prevGradesRef with the new grades state
        prevGradesRef.current = JSON.parse(JSON.stringify(savedGrades))
        await fetchTeacherData() // Refresh data
      } else {
        throw new Error(data.error)
      }
    } catch (e) {
      console.error('Failed to save grades:', e)
    }
    setGradeSaving(false)
  }

  const handlePublishGrades = async () => {
    setGradeSaving(true)
    setSaveSuccess(false)
    setPublishSuccess(false)
    try {
      const assignmentGrades = grades.filter(g => g.assignmentId === params.assignmentId).map(g => ({ ...g, publish: true }))
      console.log('Publishing grades:', assignmentGrades)
      const res = await fetch(`/api/gradebook/${params.id}/grades/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grades: assignmentGrades }),
      })
      const data = await res.json()
      console.log('Publish response:', data)
      if (data.success) {
        setPublishSuccess(true)
        // Update the grades state with the returned data (which has isPublished: true)
        const publishedGrades = data.data
        console.log('Published grades from response:', publishedGrades)
        setGrades(gs => {
          const updated = [...gs]
          publishedGrades.forEach((publishedGrade: any) => {
            const idx = updated.findIndex(g => g.assignmentId === publishedGrade.assignmentId && g.studentId === publishedGrade.studentId)
            if (idx !== -1) {
              updated[idx] = publishedGrade
            }
          })
          return updated
        })
        // Update prevGradesRef with the new grades state
        prevGradesRef.current = JSON.parse(JSON.stringify(publishedGrades))
        await fetchTeacherData() // Refresh data
      } else {
        throw new Error(data.error)
      }
    } catch (e) {
      console.error('Failed to publish grades:', e)
    }
    setGradeSaving(false)
  }

  // Detect unsaved changes and unpublished grades
  const hasUnsavedChanges = JSON.stringify(prevGradesRef.current.filter(g => g.assignmentId === params.assignmentId)) !== JSON.stringify(grades.filter(g => g.assignmentId === params.assignmentId))
  
  // Check if there are any grades that are saved but not published
  const hasUnpublishedGrades = grades.filter(g => g.assignmentId === params.assignmentId).some(g => !g.isPublished)

  // Publish button should be active if there are unpublished grades OR unsaved changes
  const canPublish = hasUnpublishedGrades || hasUnsavedChanges

  useEffect(() => {
    // On load, set prevGradesRef to loaded grades
    prevGradesRef.current = JSON.parse(JSON.stringify(grades))
  }, [grades.length, loading])

  // Fetch latest student submission if student
  useEffect(() => {
    if (!session?.user?.id || isTeacher || isAdmin) return
    const fetchSubmission = async () => {
      try {
        const [latestRes, allRes] = await Promise.all([
          fetch(`/api/assignments/${params.assignmentId}/submissions/self?userId=${session.user.id}`),
          fetch(`/api/assignments/${params.assignmentId}/submissions/history/self?userId=${session.user.id}`)
        ])
        const latestData = await latestRes.json()
        const allData = await allRes.json()
        setStudentSubmission(latestData.data)
        setStudentSubmissions(allData.data || [])
      } catch {
        setStudentSubmission(null)
        setStudentSubmissions([])
      }
    }
    fetchSubmission()
  }, [params.assignmentId, session?.user?.id, isTeacher, isAdmin])

  const getSectionName = (sectionId: string) => {
    const section = sections.find((s: any) => s.id === sectionId)
    return section ? section.name : 'Uncategorized'
  }

  const handleSubmissionSelect = (submission: any) => {
    setSelectedSubmission(submission)
  }

  // Add a function to refresh files after upload
  const refreshFiles = async () => {
    try {
      const filesRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/files/course/${params.id}`)
      const filesData = await filesRes.json()
      setFiles(filesData.data?.files || [])
    } catch {}
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.dueDate || !form.sectionId) {
      setSaveError('Name, due date, and section are required')
      return
    }
    setSaveError('')
    setSaving(true)
    const dueDateTime = form.dueTime ? `${form.dueDate}T${form.dueTime}:00` : form.dueDate
    try {
      const updated = await saveAssignment(course.id, {
        id: assignment.id,
        name: form.name,
        dueDate: dueDateTime,
        sectionId: form.sectionId,
        description: form.comment,
        maxScore: form.points,
        type: 'STANDARD',
      })
      setAssignment(updated)
      setEditing(false)
    } catch (e: any) {
      setSaveError(e.message || 'Failed to save assignment')
    } finally {
      setSaving(false)
    }
  }

  const handleDownload = async (fileId: string) => {
    try {
      const fileRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/files/download/${fileId}`)
      if (fileRes.ok) {
        const blob = await fileRes.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileRes.headers.get('Content-Disposition')?.split('filename=')[1] || 'download'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      } else {
        alert('Failed to download file')
      }
    } catch (e) {
      alert('Failed to download file')
    }
  }

  const handleDeleteFile = async (fileId: string) => {
    if (!window.confirm('Are you sure you want to delete this file?')) {
      return
    }
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/files/delete/${fileId}`, { method: 'DELETE' })
      refreshFiles()
      alert('File deleted successfully')
    } catch (e) {
      alert('Failed to delete file')
    }
  }

  const handleRenameFile = async (newName: string) => {
    if (!editingFile) return
    if (!newName.trim()) {
      alert('File name cannot be empty')
      return
    }
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/files/rename/${editingFile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      })
      refreshFiles()
      setEditingFile(null)
      alert('File renamed successfully')
    } catch (e) {
      alert('Failed to rename file')
    }
  }

  // Submission handler
  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError('')
    setSubmitting(true)
    try {
      const file = fileInputRef.current?.files?.[0]
      if (!file) {
        setSubmitError('Please select a file to submit.')
        setSubmitting(false)
        return
      }
      const formData = new FormData()
      formData.append('file', file)
      formData.append('userId', session?.user?.id || '')
      const res = await fetch(`/api/assignments/${params.assignmentId}/submissions`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.success) {
        setStudentSubmission(data.data)
        if (fileInputRef.current) fileInputRef.current.value = ''
      } else {
        setSubmitError(data.error || 'Submission failed')
      }
    } catch (err) {
      setSubmitError('Submission failed')
    } finally {
      setSubmitting(false)
    }
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

  if (error || !course || !assignment) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <p className="text-purple-400 mb-4">{error || 'Assignment not found'}</p>
            <Button onClick={() => router.push(`/courses/${params.id}`)}>
              Back to Course
            </Button>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="flex flex-col h-full">
          {/* Persistent Course Bar/Header */}
          <div className="bg-white/80 rounded-2xl shadow-lg border border-purple-100 p-6 mb-6">
            <div className="flex items-center gap-4">
              <span
                className="text-2xl font-bold text-purple-900 cursor-pointer hover:underline"
                onClick={() => router.push(`/courses/${course.id}`)}
              >
                {course.title}
              </span>
              <span className="text-purple-400">/</span>
              <span className="text-xl font-semibold text-purple-800">Assignment</span>
              <span className="ml-auto text-purple-500 text-sm">Instructor: {course.instructor?.name}</span>
            </div>
          </div>

          {/* Assignment Details & Edit */}
          <div className="bg-white/80 rounded-2xl shadow-lg border border-purple-100 p-6 mb-6">
            {!editing ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-2xl font-bold text-purple-900">{assignment.name}</h2>
                  {(isTeacher || isAdmin) && (
                    <div className="flex gap-2">
                      <Button onClick={() => setEditing(true)}>Edit</Button>
                      <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">Delete</Button>
                    </div>
                  )}
                </div>
                <div className="text-purple-600 mb-2">{assignment.description}</div>
                <div className="flex gap-6 text-sm text-purple-500 mb-2">
                  <span>Due: {assignment.dueDate ? new Date(assignment.dueDate).toLocaleString() : 'N/A'}</span>
                  <span>Category: {getSectionName(assignment.sectionId)}</span>
                  <span>Points: {assignment.maxScore}</span>
                </div>
              </>
            ) : (
              <AssignmentForm
                form={form}
                setForm={setForm}
                sections={sections}
                editing={true}
                onSave={handleSave}
                onCancel={() => setEditing(false)}
                error={saveError}
                loading={saving}
              />
            )}
          </div>

          {/* File Upload & List */}
          {(isTeacher || isAdmin) && (
            <div className="bg-white/80 rounded-2xl shadow-lg border border-purple-100 p-6 mb-6">
              <h3 className="text-lg font-semibold text-purple-900 mb-2">Files</h3>
              <FileUpload
                courseId={course.id}
                userId={session?.user?.id || ''}
                onUpload={refreshFiles}
                assignmentId={assignment.id}
              />
              <div className="overflow-x-auto mt-4">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-purple-700 border-b border-purple-200">
                      <th className="text-left py-3 px-2">Name</th>
                      <th className="text-left py-3 px-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.filter((file: any) => file.assignmentId === assignment.id).map((file: any) => (
                      <tr key={file.id} className="hover:bg-purple-50 border-b border-purple-100 cursor-pointer">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-purple-900">{file.filename}</span>
                            {file.protect && (
                              <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">Protected</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => handleDownload(file.id)} title="Download">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" /></svg>
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => setEditingFile(file)} title="Rename">
                              <Edit className="w-4 h-4 text-purple-700" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDeleteFile(file.id)} title="Delete">
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Teacher Student Grades Table */}
          {(isTeacher || isAdmin) && (
            <div className="bg-white/80 rounded-2xl shadow-lg border border-purple-100 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-semibold text-purple-900">Student Grades</h3>
                  <div className="flex items-center gap-2">
                    <button
                      className={`bg-purple-600 text-white px-4 py-2 rounded disabled:opacity-50`}
                      onClick={handleSaveGrades}
                      disabled={gradeSaving || !hasUnsavedChanges}
                    >
                      {gradeSaving ? 'Saving...' : 'Save Grades'}
                    </button>
                    <button
                      className={`bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50`}
                      onClick={handlePublishGrades}
                      disabled={gradeSaving || !canPublish}
                    >
                      {gradeSaving ? 'Publishing...' : 'Publish Grades'}
                    </button>
                    {saveSuccess && <span className="text-green-600 font-semibold">Grades saved!</span>}
                    {publishSuccess && <span className="text-green-600 font-semibold">Grades published!</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-purple-700">Grade Input:</span>
                  <div className="flex border rounded overflow-hidden">
                    <button
                      className={`px-3 py-1 text-sm font-medium transition-colors ${
                        inputMode === 'raw'
                          ? 'bg-purple-600 text-white'
                          : 'bg-white text-purple-700 hover:bg-purple-50'
                      }`}
                      onClick={() => setInputMode('raw')}
                    >
                      Raw
                    </button>
                    <button
                      className={`px-3 py-1 text-sm font-medium transition-colors ${
                        inputMode === 'percent'
                          ? 'bg-purple-600 text-white'
                          : 'bg-white text-purple-700 hover:bg-purple-50'
                      }`}
                      onClick={() => setInputMode('percent')}
                    >
                      Percent
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-purple-100 border-b border-purple-200">
                      <th className="text-left py-3 px-4 font-semibold text-purple-900">Student Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-purple-900">Grade</th>
                      <th className="text-left py-3 px-4 font-semibold text-purple-900">Submission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => {
                      const grade = grades.find(g => g.assignmentId === params.assignmentId && g.studentId === student.id)
                      const submission = submissions.find(s => s.assignmentId === params.assignmentId && s.studentId === student.id)
                      const hasSubmission = submission !== undefined
                      
                      const getGradeValue = (grade: Grade) => {
                        if (inputMode === 'percent' && assignment?.maxScore) {
                          return Math.round((grade.score / assignment.maxScore) * 100)
                        } else {
                          return grade.score
                        }
                      }

                      return (
                        <tr key={student.id} className="border-b border-purple-100 hover:bg-purple-50">
                          <td className="py-3 px-4">
                            <span className="font-medium text-purple-900">{student.name}</span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min={0}
                                max={inputMode === 'percent' ? 100 : assignment?.maxScore || 100}
                                value={grade ? getGradeValue(grade) : ''}
                                onChange={e => handleGradeChange(student.id, e.target.value === '' ? '' : Number(e.target.value))}
                                className="w-16 border rounded px-1 text-sm"
                                placeholder={inputMode === 'percent' ? '%' : '0'}
                              />
                              <span className="text-xs text-gray-500">
                                {inputMode === 'percent' ? '%' : `/ ${assignment?.maxScore || 100}`}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {hasSubmission ? (
                              <button
                                className="text-blue-600 hover:text-blue-800 underline font-medium"
                                onClick={() => setShowAssignmentModal({ studentId: student.id, studentName: student.name })}
                              >
                                {student.name} - {assignment.name}
                              </button>
                            ) : (
                              <span className="text-red-500 font-medium">No Submission</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {/* For students, just show assignment-related files in a table with download button, no edit/delete, and only show 'Protected' tag for teachers/admins */}
          {!(isTeacher || isAdmin) && (
            <div className="bg-white/80 rounded-2xl shadow-lg border border-purple-100 p-6 mb-6">
              <h3 className="text-lg font-semibold text-purple-900 mb-2">Files</h3>
              <div className="overflow-x-auto mt-4">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-purple-700 border-b border-purple-200">
                      <th className="text-left py-3 px-2">Name</th>
                      <th className="text-left py-3 px-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.filter((file: any) => file.assignmentId === assignment.id).map((file: any) => (
                      <tr key={file.id} className="hover:bg-purple-50 border-b border-purple-100 cursor-pointer">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-purple-900">{file.filename}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => handleDownload(file.id)} title="Download">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" /></svg>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Student Assignment View */}
          {!(isTeacher || isAdmin) && (
            <div className="bg-white/80 rounded-2xl shadow-lg border border-purple-100 p-6 mb-6">
              <h3 className="text-lg font-semibold text-purple-900 mb-4">Assignment Submission</h3>
              
              {/* Submission Form */}
              {!studentSubmission ? (
                <form onSubmit={handleStudentSubmit} className="flex items-center gap-2 mb-4">
                  <input
                    type="file"
                    accept="application/pdf"
                    ref={fileInputRef}
                    className="border rounded px-2 py-1"
                    disabled={submitting}
                  />
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit Assignment'}
                  </Button>
                  {submitError && <div className="text-red-600 text-sm ml-2">{submitError}</div>}
                </form>
              ) : (
                <div className="mb-4">
                  <div className="text-green-700 font-medium mb-2">You have submitted this assignment.</div>
                  <div className="text-sm text-purple-600 mb-2">
                    Submitted: {new Date(studentSubmission.createdAt).toLocaleString()}<br />
                    Status: {studentSubmission.status}
                  </div>
                  <form onSubmit={handleStudentSubmit} className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="application/pdf"
                      ref={fileInputRef}
                      className="border rounded px-2 py-1"
                      disabled={submitting}
                    />
                    <Button type="submit" disabled={submitting}>
                      {submitting ? 'Resubmitting...' : 'Resubmit Assignment'}
                    </Button>
                  </form>
                  {submitError && <div className="text-red-600 text-sm mt-2">{submitError}</div>}
                </div>
              )}

              {/* Main Content Area - Submission Viewer */}
              {studentSubmission && (
                <div className="flex h-[70vh] border rounded-lg overflow-hidden">
                  {/* Left side - PDF Preview */}
                  <div className="flex-1 flex flex-col bg-gray-50">
                    {/* Submission header */}
                    <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">Viewing:</span>
                        <span className="text-sm text-gray-900">
                          {(selectedSubmission || studentSubmission)?.file?.filename?.includes('-') 
                            ? (selectedSubmission || studentSubmission)?.file?.filename?.split('-').slice(-1)[0]
                            : (selectedSubmission || studentSubmission)?.file?.filename}
                        </span>
                        {selectedSubmission && (
                          <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                            Past Submission
                          </span>
                        )}
                      </div>
                      {selectedSubmission && (
                        <button
                          onClick={() => setSelectedSubmission(null)}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          Back to Latest
                        </button>
                      )}
                    </div>
                    
                    {/* PDF Preview */}
                    <div className="flex-1 flex items-center justify-center">
                      {(selectedSubmission || studentSubmission)?.file?.mimetype === 'application/pdf' ? (
                        <iframe
                          src={`${process.env.NEXT_PUBLIC_API_URL}/files/preview/${(selectedSubmission || studentSubmission).fileId}`}
                          title="Submission Preview"
                          className="w-full h-full border-0"
                        />
                      ) : (
                        <div className="p-4 text-center">
                          <p className="text-gray-500 mb-2">Cannot preview this file type.</p>
                          <a
                            href={`${process.env.NEXT_PUBLIC_API_URL}/files/download/${(selectedSubmission || studentSubmission).fileId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline"
                          >
                            Download File
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right side - Grades and History */}
                  <div className="w-80 border-l bg-gray-50 flex flex-col">
                    {/* Tab buttons */}
                    <div className="flex border-b bg-white">
                      <button
                        className={`flex-1 px-4 py-2 text-sm font-medium ${
                          activeStudentTab === 'grades' 
                            ? 'bg-purple-100 text-purple-700 border-b-2 border-purple-700' 
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                        onClick={() => setActiveStudentTab('grades')}
                      >
                        Grades
                      </button>
                      {studentSubmissions.length > 1 && (
                        <button
                          className={`flex-1 px-4 py-2 text-sm font-medium ${
                            activeStudentTab === 'history' 
                              ? 'bg-purple-100 text-purple-700 border-b-2 border-purple-700' 
                              : 'text-gray-600 hover:text-gray-800'
                          }`}
                          onClick={() => setActiveStudentTab('history')}
                        >
                          Past Submissions ({studentSubmissions.length})
                        </button>
                      )}
                    </div>

                    {/* Tab content */}
                    <div className="flex-1 overflow-y-auto p-4">
                      {activeStudentTab === 'grades' && (
                        <div className="space-y-4">
                          <h4 className="font-semibold text-gray-700">Your Grade</h4>
                          
                          {/* Fetch and display student's grade */}
                          <StudentGradeDisplay 
                            assignmentId={params.assignmentId}
                            studentId={session?.user?.id || ''}
                            courseId={params.id}
                            assignment={assignment}
                          />
                        </div>
                      )}

                      {activeStudentTab === 'history' && studentSubmissions.length > 1 && (
                        <div className="space-y-4">
                          <h4 className="font-semibold text-gray-700">Submission History</h4>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {studentSubmissions.map((submission, index) => {
                              const isLatest = index === 0 // First submission (highest order) is the latest
                              const isSelected = selectedSubmission?.id === submission.id
                              // Extract just the filename without the backend ID prefix
                              const filename = submission.file.filename.includes('-') 
                                ? submission.file.filename.split('-').slice(-1)[0] 
                                : submission.file.filename
                              
                              return (
                                <div
                                  key={submission.id}
                                  className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                                    isSelected ? 'bg-blue-50 border-blue-300' : 
                                    isLatest ? 'bg-green-50 border-green-200' : 'border-gray-200'
                                  }`}
                                  onClick={() => handleSubmissionSelect(submission)}
                                >
                                  <div className="space-y-2">
                                    {/* Filename */}
                                    <div className="font-medium text-sm text-gray-900 truncate">
                                      {filename}
                                    </div>
                                    
                                    {/* Status tags */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {submission.status && (
                                        <span className={`px-2 py-0.5 rounded text-xs ${
                                          submission.status === 'LATE' 
                                            ? 'bg-red-100 text-red-700' 
                                            : 'bg-green-100 text-green-700'
                                        }`}>
                                          {submission.status}
                                        </span>
                                      )}
                                      
                                      {/* Latest tag */}
                                      {isLatest && (
                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                                          Latest
                                        </span>
                                      )}
                                    </div>
                                    
                                    {/* Action buttons */}
                                    <div className="flex gap-1">
                                      <button
                                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleSubmissionSelect(submission)
                                        }}
                                      >
                                        {isSelected ? 'Viewing' : 'View'}
                                      </button>
                                      <a
                                        href={`${process.env.NEXT_PUBLIC_API_URL}/files/download/${submission.file.id}`}
                                        download
                                        className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors inline-block"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        Download
                                      </a>
                                    </div>
                                    
                                    {/* Submission time */}
                                    <div className="text-xs text-gray-500">
                                      Submitted: {new Date(submission.createdAt).toLocaleString()}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AssignmentViewerModal for teacher grading */}
          {showAssignmentModal && (isTeacher || isAdmin) && (
            <AssignmentViewerModal
              assignmentId={params.assignmentId}
              assignmentName={assignment.name}
              studentId={showAssignmentModal.studentId}
              studentName={showAssignmentModal.studentName}
              courseId={params.id}
              open={!!showAssignmentModal}
              onClose={() => setShowAssignmentModal(null)}
              isTeacher={true}
              onGradeSaved={fetchTeacherData}
            />
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
} 