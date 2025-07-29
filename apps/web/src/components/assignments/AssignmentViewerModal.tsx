import React, { useEffect, useState } from 'react'
import { X, Download } from 'lucide-react'

interface Submission {
  id: string
  order: number
  status: string
  createdAt: string
  file: {
    id: string
    filename: string
    path: string
    size: number
    mimetype?: string
  }
}

interface Grade {
  id?: string
  assignmentId: string
  studentId: string
  score: number
  comment?: string
  status: string
  submittedAt?: string
  isPublished?: boolean // Added for publish status
}

interface AssignmentViewerModalProps {
  assignmentId: string
  assignmentName: string
  studentId: string
  studentName: string
  courseId: string
  open: boolean
  onClose: () => void
  isTeacher: boolean
  onGradeSaved?: () => void // Callback to refresh gradebook
}

export default function AssignmentViewerModal({
  assignmentId,
  assignmentName,
  studentId,
  studentName,
  courseId,
  open,
  onClose,
  isTeacher,
  onGradeSaved,
}: AssignmentViewerModalProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
  const [activeTab, setActiveTab] = useState<'grade' | 'history'>('grade')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [grade, setGrade] = useState<Grade>({
    assignmentId,
    studentId,
    score: 0,
    status: 'ON_TIME',
    comment: ''
  })
  const [saving, setSaving] = useState(false)
  const [inputMode, setInputMode] = useState<'raw' | 'percent'>('raw')
  const [assignment, setAssignment] = useState<any>(null)
  const [originalGrade, setOriginalGrade] = useState<Grade | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError(null)
    Promise.all([
      fetch(`/api/assignments/${assignmentId}/submissions/${studentId}`),
      isTeacher ? fetch(`/api/gradebook/${courseId}/grades`).then(res => res.json()) : Promise.resolve({ data: [] }),
      fetch(`/api/gradebook/${courseId}/assignments`).then(res => res.json())
    ])
      .then(([submissionsRes, gradesData, assignmentsData]) => {
        return Promise.all([
          submissionsRes.json(),
          Promise.resolve(gradesData),
          Promise.resolve(assignmentsData)
        ])
      })
      .then(([submissionsData, gradesData, assignmentsData]) => {
        const submissionsList = submissionsData.data || []
        setSubmissions(submissionsList)
        setSelectedSubmission(submissionsList[0] || null)
        
        // Get assignment data for maxScore
        const assignmentData = assignmentsData.data?.find((a: any) => a.id === assignmentId)
        setAssignment(assignmentData)
        
        if (isTeacher && gradesData.data) {
          const existingGrade = gradesData.data.find((g: Grade) =>
            g.assignmentId === assignmentId && g.studentId === studentId
          )
          if (existingGrade) {
            setGrade(existingGrade)
            setOriginalGrade(existingGrade)
          }
        }
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load data')
        setLoading(false)
      })
  }, [open, assignmentId, studentId, courseId, isTeacher])

  // Check if there are unsaved changes
  const hasUnsavedChanges = originalGrade && JSON.stringify(originalGrade) !== JSON.stringify(grade)

  // Publish button should be active if grade is unpublished OR there are unsaved changes
  const canPublish = !grade.isPublished || hasUnsavedChanges

  const handleGradeChange = (field: keyof Grade, value: any) => {
    setGrade(prev => ({ ...prev, [field]: value }))
  }

  const getGradeValue = (grade: Grade) => {
    if (inputMode === 'percent' && assignment?.maxScore) {
      return Math.round((grade.score / assignment.maxScore) * 100)
    } else {
      return grade.score
    }
  }

  const handleScoreChange = (value: number | '') => {
    if (value === '' || value === null || isNaN(Number(value))) {
      handleGradeChange('score', 0)
      return
    }
    
    let newScore = value
    if (inputMode === 'percent' && assignment?.maxScore) {
      newScore = Math.round((Number(value) / 100) * assignment.maxScore)
    }
    handleGradeChange('score', newScore)
  }

  const handleSaveGrade = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/gradebook/${courseId}/grades/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grades: [grade] }),
      })
      const data = await res.json()
      if (data.success) {
        setGrade(data.data[0])
        alert('Grade saved successfully!')
        onGradeSaved?.() // Refresh gradebook
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      alert('Failed to save grade')
    } finally {
      setSaving(false)
    }
  }

  const handlePublishGrade = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/gradebook/${courseId}/grades/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grades: [{ ...grade, publish: true }] }),
      })
      const data = await res.json()
      if (data.success) {
        setGrade(data.data[0])
        alert('Grade published successfully!')
        onGradeSaved?.() // Refresh gradebook
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      alert('Failed to publish grade')
    } finally {
      setSaving(false)
    }
  }

  const handleDownload = (submission: Submission) => {
    const link = document.createElement('a')
    link.href = `/api/files/${submission.file.id}/download`
    link.download = submission.file.filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleRecoverSubmission = async (submissionId: string) => {
    if (!confirm('Are you sure you want to recover this submission as the latest? This will overwrite the current latest submission.')) {
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/assignments/${assignmentId}/submissions/${studentId}/recover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId }),
      })
      const data = await res.json()
              if (data.success) {
          // Refresh submissions to get updated order
          const submissionsRes = await fetch(`/api/assignments/${assignmentId}/submissions/${studentId}`)
          const submissionsData = await submissionsRes.json()
          if (submissionsData.success) {
            setSubmissions(submissionsData.data)
            // Set the recovered submission as selected (it will now be first in the array)
            setSelectedSubmission(submissionsData.data[0])
            // Switch to grade tab to show the updated submission
            setActiveTab('grade')
            alert('Submission recovered successfully! The recovered submission is now the latest.')
          }
          onGradeSaved?.() // Refresh gradebook
        } else {
        throw new Error(data.error)
      }
    } catch (err) {
      alert('Failed to recover submission')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-7xl h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-bold">
            {assignmentName} - {studentName}
          </h2>
          <button onClick={onClose} aria-label="Close" className="text-2xl">×</button>
        </div>
        <div className="flex flex-1 overflow-hidden">
          {/* Left side - PDF Preview */}
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            {selectedSubmission && selectedSubmission.file.mimetype === 'application/pdf' ? (
              <iframe
                src={`${process.env.NEXT_PUBLIC_API_URL}/files/preview/${selectedSubmission.file.id}`}
                title="PDF Preview"
                className="w-full h-full border-0"
                onError={() => console.error('Failed to load PDF preview')}
              />
            ) : selectedSubmission ? (
              <div className="p-4 text-center">
                <p className="text-gray-500 mb-2">Cannot preview this file type.</p>
                <a
                  href={`${process.env.NEXT_PUBLIC_API_URL}/files/download/${selectedSubmission.file.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  Download File
                </a>
              </div>
            ) : loading ? (
              <div className="p-4">Loading...</div>
            ) : error ? (
              <div className="p-4 text-red-500">{error}</div>
            ) : (
              <div className="p-4 text-gray-500">No submission to preview</div>
            )}
          </div>
          {/* Right side - Sidebar */}
          <div className="w-80 border-l bg-gray-50 flex flex-col">
            {/* Tab buttons */}
            <div className="flex border-b bg-white">
              {isTeacher && (
                <button
                  className={`flex-1 px-4 py-2 text-sm font-medium ${
                    activeTab === 'grade' 
                      ? 'bg-purple-100 text-purple-700 border-b-2 border-purple-700' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                  onClick={() => setActiveTab('grade')}
                >
                  Grade
                </button>
              )}
              {submissions.length > 1 && (
                <button
                  className={`flex-1 px-4 py-2 text-sm font-medium ${
                    activeTab === 'history' 
                      ? 'bg-purple-100 text-purple-700 border-b-2 border-purple-700' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                  onClick={() => setActiveTab('history')}
                >
                  Submission History ({submissions.length})
                </button>
              )}
            </div>
            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'grade' && isTeacher && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Grade Input
                    </label>
                    <div className="flex">
                      <button
                        className={`flex-1 px-3 py-1 text-sm rounded-l border ${
                          inputMode === 'raw' 
                            ? 'bg-purple-600 text-white border-purple-600' 
                            : 'bg-purple-100 text-purple-700 border-purple-200'
                        }`}
                        onClick={() => setInputMode('raw')}
                      >
                        Raw
                      </button>
                      <button
                        className={`flex-1 px-3 py-1 text-sm rounded-r border ${
                          inputMode === 'percent' 
                            ? 'bg-purple-600 text-white border-purple-600' 
                            : 'bg-purple-100 text-purple-700 border-purple-200'
                        }`}
                        onClick={() => setInputMode('percent')}
                      >
                        Percent
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Score
                    </label>
                    <div className="flex items-center">
                      <input
                        type="number"
                        min={0}
                        max={inputMode === 'percent' ? 100 : assignment?.maxScore || 100}
                        value={getGradeValue(grade)}
                        onChange={(e) => handleScoreChange(e.target.value === '' ? '' : Number(e.target.value))}
                        className="flex-1 border rounded-l px-3 py-2"
                        placeholder={inputMode === 'percent' ? 'Enter percentage' : 'Enter score'}
                      />
                      <span className="px-3 py-2 bg-gray-100 border-t border-r border-b rounded-r text-sm text-gray-600">
                        {inputMode === 'percent' ? '%' : `/ ${assignment?.maxScore || 100}`}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={grade.status}
                      onChange={(e) => handleGradeChange('status', e.target.value)}
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="ON_TIME">On Time</option>
                      <option value="LATE">Late</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Feedback
                    </label>
                    <textarea
                      value={grade.comment || ''}
                      onChange={(e) => handleGradeChange('comment', e.target.value)}
                      className="w-full border rounded px-3 py-2 h-24 resize-none"
                      placeholder="Enter feedback..."
                    />
                  </div>
                  <div className="space-y-2">
                    <button
                      onClick={handleSaveGrade}
                      disabled={saving}
                      className="w-full bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Grade'}
                    </button>
                    <button
                      onClick={handlePublishGrade}
                      disabled={saving || !canPublish}
                      className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      {saving ? 'Publishing...' : grade.isPublished && !hasUnsavedChanges ? 'Already Published' : 'Publish Grade'}
                    </button>
                  </div>
                </div>
              )}
              {activeTab === 'history' && submissions.length > 1 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-700">Submission History</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {submissions.map((submission, index) => {
                      const isLatest = index === 0 // First submission (highest order) is the latest
                      // Extract just the filename without the backend ID prefix
                      const filename = submission.file.filename.includes('-') 
                        ? submission.file.filename.split('-').slice(-1)[0] 
                        : submission.file.filename
                      
                      return (
                        <div
                          key={submission.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedSubmission?.id === submission.id
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 hover:border-gray-300'
                          } ${isLatest ? 'bg-green-50 border-green-200' : ''}`}
                          onClick={() => setSelectedSubmission(submission)}
                        >
                          <div className="space-y-2">
                            {/* Filename */}
                            <div className="font-medium text-sm text-gray-900 truncate">
                              {filename}
                            </div>
                            
                            {/* Status and action buttons row */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                {/* Status tags */}
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
                              <div className="flex items-center gap-1">
                                {selectedSubmission?.id !== submission.id && isTeacher && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleRecoverSubmission(submission.id)
                                    }}
                                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                  >
                                    Recover
                                  </button>
                                )}
                                <a
                                  href={`${process.env.NEXT_PUBLIC_API_URL}/files/download/${submission.file.id}`}
                                  download
                                  onClick={(e) => e.stopPropagation()}
                                  className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                                >
                                  Download
                                </a>
                              </div>
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
      </div>
    </div>
  )
} 