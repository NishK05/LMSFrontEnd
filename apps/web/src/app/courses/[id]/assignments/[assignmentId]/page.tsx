"use client"

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { Button } from '@lms/ui'
import { getSections } from '../../../../gradebook/api'
import { saveAssignment } from '../../../../gradebook/api'
import AssignmentForm from '../../../../gradebook/Teacher/AssignmentForm'
import FileUpload from '@/components/files/FileUpload'
import { Trash2, Edit } from 'lucide-react'

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

  const isTeacher = session?.user?.role === 'TEACHER' || course?.instructorId === session?.user?.id
  const isAdmin = session?.user?.role === 'ADMIN'

  const getSectionName = (sectionId: string) => {
    const section = sections.find((s: any) => s.id === sectionId)
    return section ? section.name : 'Uncategorized'
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
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
} 