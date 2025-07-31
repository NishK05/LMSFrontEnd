import React, { useEffect, useState } from 'react'
import { X, Download } from 'lucide-react'
import { RubricViewer } from './RubricViewer'

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
  rubricSelections?: string[] // Array of checked rubric item IDs
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
  const [aiGrading, setAiGrading] = useState(false)
  const [inputMode, setInputMode] = useState<'raw' | 'percent'>('raw')
  const [assignment, setAssignment] = useState<any>(null)
  const [originalGrade, setOriginalGrade] = useState<Grade | null>(null)
  const [rubricSelections, setRubricSelections] = useState<Set<string>>(new Set())

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
            // Load existing rubric selections
            if (existingGrade.rubricSelections) {
              setRubricSelections(new Set(existingGrade.rubricSelections))
            }
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

  const handleAIGrade = async () => {
    setAiGrading(true)
    try {
      // Get the latest submission for this student
      const submissionRes = await fetch(`/api/assignments/${assignmentId}/submissions/${studentId}`)
      const submissionData = await submissionRes.json()
      
      if (!submissionData.success || !submissionData.data) {
        alert('No submission found for this student')
        return
      }

      const submission = submissionData.data

      const res = await fetch(`/api/gradebook/${courseId}/assignments/${assignmentId}/ai-grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          studentId
        }),
      })
      const data = await res.json()
      if (data.success) {
        const aiResult = data.data
        setGrade(prev => ({
          ...prev,
          score: aiResult.score,
          comment: aiResult.feedback,
          rubricSelections: aiResult.rubricSelections,
          isPublished: false // AI grades are saved as drafts
        }))
        alert('AI grading completed! Review and save the grade.')
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      console.error('AI grading error:', err)
      alert('Failed to grade with AI')
    } finally {
      setAiGrading(false)
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
          {/* Left side - File Preview */}
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            {selectedSubmission ? (
              (() => {
                const file = selectedSubmission.file
                
                // PDF Preview
                if (file.mimetype === 'application/pdf') {
                  return (
              <iframe
                      src={`${process.env.NEXT_PUBLIC_API_URL}/files/preview/${file.id}`}
                title="PDF Preview"
                className="w-full h-full border-0"
                onError={() => console.error('Failed to load PDF preview')}
              />
                  )
                }
                
                // Image Preview
                if (file.mimetype && file.mimetype.startsWith('image/')) {
                  console.log('File MIME type:', file.mimetype, 'File:', file)
                  const imageUrl = `/api/files/preview/${file.id}`
                  console.log('Image URL:', imageUrl)
                  return (
                    <div className="w-full h-full flex items-center justify-center p-4">
                      <img
                        src={imageUrl}
                        alt="File Preview"
                        className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                        onLoad={() => console.log('Image loaded successfully')}
                        onError={(e) => {
                          console.error('Failed to load image preview:', e)
                          console.error('Image URL was:', imageUrl)
                        }}
                      />
                    </div>
                  )
                }
                
                // Fallback: Check file extension for common image formats
                const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg']
                const fileExtension = file.filename.toLowerCase().substring(file.filename.lastIndexOf('.'))
                if (imageExtensions.includes(fileExtension)) {
                  console.log('File extension suggests image:', fileExtension, 'File:', file)
                  const imageUrl = `/api/files/preview/${file.id}`
                  return (
                    <div className="w-full h-full flex items-center justify-center p-4">
                      <img
                        src={imageUrl}
                        alt="File Preview"
                        className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                        onLoad={() => console.log('Image loaded successfully (fallback)')}
                        onError={(e) => {
                          console.error('Failed to load image preview (fallback):', e)
                          console.error('Image URL was:', imageUrl)
                        }}
                      />
                    </div>
                  )
                }
                
                // Other file types - show download option
                return (
              <div className="p-4 text-center">
                    <div className="mb-4">
                      <div className="w-16 h-16 mx-auto bg-gray-200 rounded-full flex items-center justify-center mb-3">
                        <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                <p className="text-gray-500 mb-2">Cannot preview this file type.</p>
                      <p className="text-sm text-gray-400 mb-4">{file.filename}</p>
                    </div>
                <a
                      href={`${process.env.NEXT_PUBLIC_API_URL}/files/download/${file.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                  Download File
                </a>
              </div>
                )
              })()
            ) : loading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
                <p className="text-gray-500">Loading submission...</p>
              </div>
            ) : error ? (
              <div className="p-4 text-center">
                <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-3">
                  <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-red-500 mb-2">Error loading submission</p>
                <p className="text-sm text-gray-500">{error}</p>
              </div>
            ) : (
              <div className="p-4 text-center">
                <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-3">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-500">No submission to preview</p>
              </div>
            )}
          </div>
          {/* Right side - Sidebar */}
          <div className="w-96 border-l bg-gray-50 flex flex-col">
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
                  {/* Rubric Viewer */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rubric
                    </label>
                    <RubricViewer
                      assignmentId={assignmentId}
                      courseId={courseId}
                      onScoreChange={(score) => {
                        if (inputMode === 'raw') {
                          handleScoreChange(score)
                        } else {
                          // Convert to percentage
                          const percentage = assignment?.maxScore ? (score / assignment.maxScore) * 100 : 0
                          handleScoreChange(percentage)
                        }
                      }}
                      onFeedbackChange={(feedback) => handleGradeChange('comment', feedback)}
                      onRubricSelectionsChange={(selections) => {
                        setRubricSelections(selections)
                        // Update grade with new rubric selections
                        setGrade(prev => ({
                          ...prev,
                          rubricSelections: Array.from(selections)
                        }))
                      }}
                      currentScore={grade.score}
                      currentFeedback={grade.comment || ''}
                      initialSelections={rubricSelections}
                    />
                  </div>

                  <div className="border-t border-gray-200 pt-4">
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
                    <div className="mt-3">
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
                    <div className="mt-3">
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
                    <div className="mt-3">
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
                    <div className="space-y-2 mt-4">
                      <button
                        onClick={handleAIGrade}
                        disabled={aiGrading}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        {aiGrading ? 'AI Grading...' : 'Grade with AI'}
                      </button>
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