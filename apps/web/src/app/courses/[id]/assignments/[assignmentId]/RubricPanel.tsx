"use client"

import { useState, useEffect, useRef } from 'react'
import { Button } from '@lms/ui'
import { Plus, Edit, Trash2, Check, X, Sparkles, FileText, Eye, MoreVertical, Save, Send } from 'lucide-react'
import { AIRubricGenerator } from './AIRubricGenerator'
import { RubricBuilder } from './RubricBuilder'

interface Rubric {
  id: string
  name: string
  type: 'MANUAL' | 'AI_GENERATED'
  content: any
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface RubricPanelProps {
  courseId: string
  assignmentId: string
  isTeacher: boolean
  assignmentMaxScore?: number
}

export function RubricPanel({ courseId, assignmentId, isTeacher, assignmentMaxScore = 100 }: RubricPanelProps) {
  const [rubrics, setRubrics] = useState<Rubric[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRubric, setSelectedRubric] = useState<Rubric | null>(null)
  const [showAIRubricGenerator, setShowAIRubricGenerator] = useState(false)
  const [showRubricBuilder, setShowRubricBuilder] = useState(false)
  const [showRubricViewer, setShowRubricViewer] = useState(false)
  const [viewingRubric, setViewingRubric] = useState<Rubric | null>(null)
  const [editingRubric, setEditingRubric] = useState<Rubric | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    content: { sections: [] }
  })
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [publishSuccess, setPublishSuccess] = useState(false)
  const [showDropdown, setShowDropdown] = useState<string | null>(null)
  const [renamingRubric, setRenamingRubric] = useState<{ id: string; name: string } | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch rubrics
  const fetchRubrics = async () => {
    try {
      const response = await fetch(`/api/gradebook/${courseId}/assignments/${assignmentId}/rubrics`)
      const data = await response.json()
      if (data.success) {
        setRubrics(data.data)
        setSelectedRubric(data.data.find((r: Rubric) => r.isActive) || null)
      } else {
        setError(data.error || 'Failed to fetch rubrics')
      }
    } catch (err) {
      setError('Failed to fetch rubrics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRubrics()
  }, [courseId, assignmentId])

  // Clear success messages after delay
  useEffect(() => {
    if (saveSuccess || publishSuccess) {
      const timer = setTimeout(() => {
        setSaveSuccess(false)
        setPublishSuccess(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [saveSuccess, publishSuccess])

  // Delete rubric
  const handleDeleteRubric = async (rubricId: string) => {
    if (!confirm('Are you sure you want to delete this rubric?')) return

    try {
      const response = await fetch(`/api/gradebook/${courseId}/assignments/${assignmentId}/rubrics/${rubricId}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      if (data.success) {
        setRubrics(rubrics.filter(r => r.id !== rubricId))
        if (selectedRubric?.id === rubricId) {
          setSelectedRubric(null)
        }
        setError(null)
      } else {
        setError(data.error || 'Failed to delete rubric')
      }
    } catch (err) {
      setError('Failed to delete rubric')
    }
  }

  // Activate rubric
  const handleActivateRubric = async (rubricId: string) => {
    try {
      const response = await fetch(`/api/gradebook/${courseId}/assignments/${assignmentId}/rubrics/${rubricId}/activate`, {
        method: 'POST'
      })

      const data = await response.json()
      if (data.success) {
        setRubrics(rubrics.map(r => ({ ...r, isActive: r.id === rubricId })))
        setSelectedRubric(data.data)
        setError(null)
      } else {
        setError(data.error || 'Failed to activate rubric')
      }
    } catch (err) {
      setError('Failed to activate rubric')
    }
  }

  // Handle manual rubric save
  const handleManualRubricSave = async (content: any) => {
    if (!formData.name.trim()) {
      setError('Rubric name is required')
      return
    }

    try {
      const response = await fetch(`/api/gradebook/${courseId}/assignments/${assignmentId}/rubrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          type: 'MANUAL',
          content,
          isActive: false
        })
      })

      const data = await response.json()
      if (data.success) {
        setRubrics([...rubrics, data.data])
        setShowRubricBuilder(false)
        setFormData({ name: '', content: { sections: [] } })
        setError(null)
      } else {
        setError(data.error || 'Failed to create rubric')
      }
    } catch (err) {
      setError('Failed to create rubric')
    }
  }

  // Handle AI rubric success
  const handleAIRubricSuccess = () => {
    fetchRubrics()
    setShowAIRubricGenerator(false)
  }

  // Handle rubric editing
  const handleEditRubric = (rubric: Rubric) => {
    setEditingRubric(rubric)
    setFormData({
      name: rubric.name,
      content: rubric.content
    })
    setShowRubricBuilder(true)
  }

  // Handle rubric viewing
  const handleViewRubric = (rubric: Rubric) => {
    setViewingRubric(rubric)
    setShowRubricViewer(true)
  }

  // Handle rubric renaming
  const handleRenameRubric = async (rubricId: string, newName: string) => {
    if (!newName.trim()) {
      setError('Rubric name is required')
      return
    }

    try {
      const response = await fetch(`/api/gradebook/${courseId}/assignments/${assignmentId}/rubrics/${rubricId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() })
      })

      const data = await response.json()
      if (data.success) {
        setRubrics(rubrics.map(r => r.id === rubricId ? { ...r, name: newName.trim() } : r))
        setRenamingRubric(null)
        setError(null)
      } else {
        setError(data.error || 'Failed to rename rubric')
      }
    } catch (err) {
      setError('Failed to rename rubric')
    }
  }

  // Handle rubric save (draft)
  const handleSaveRubric = async (content: any) => {
    if (!formData.name.trim()) {
      setError('Rubric name is required')
      return
    }

    setSaving(true)
    setSaveSuccess(false)
    setError(null)

    try {
      const response = await fetch(`/api/gradebook/${courseId}/assignments/${assignmentId}/rubrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          type: 'MANUAL',
          content,
          isActive: false // Save as draft
        })
      })

      const data = await response.json()
      if (data.success) {
        setRubrics([...rubrics, data.data])
        setShowRubricBuilder(false)
        setFormData({ name: '', content: { sections: [] } })
        setSaveSuccess(true)
        setError(null)
      } else {
        setError(data.error || 'Failed to save rubric')
      }
    } catch (err) {
      setError('Failed to save rubric')
    } finally {
      setSaving(false)
    }
  }

  // Handle rubric publish
  const handlePublishRubric = async (content: any) => {
    if (!formData.name.trim()) {
      setError('Rubric name is required')
      return
    }

    setPublishing(true)
    setPublishSuccess(false)
    setError(null)

    try {
      const response = await fetch(`/api/gradebook/${courseId}/assignments/${assignmentId}/rubrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          type: 'MANUAL',
          content,
          isActive: true // Publish immediately
        })
      })

      const data = await response.json()
      if (data.success) {
        setRubrics([...rubrics, data.data])
        setShowRubricBuilder(false)
        setFormData({ name: '', content: { sections: [] } })
        setPublishSuccess(true)
        setError(null)
      } else {
        setError(data.error || 'Failed to publish rubric')
      }
    } catch (err) {
      setError('Failed to publish rubric')
    } finally {
      setPublishing(false)
    }
  }

  // Cancel all modals
  const handleCancelModals = () => {
    setShowAIRubricGenerator(false)
    setShowRubricBuilder(false)
    setShowRubricViewer(false)
    setEditingRubric(null)
    setViewingRubric(null)
    setRenamingRubric(null)
    setShowDropdown(null)
    setFormData({ name: '', content: { sections: [] } })
    setError(null)
  }

  if (loading) {
    return (
      <div className="bg-white/80 rounded-2xl shadow-lg border border-purple-100 p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto"></div>
      </div>
    )
  }

  return (
    <>
      {/* Compact Rubric Panel */}
      <div className="bg-white/80 rounded-2xl shadow-lg border border-purple-100 p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-purple-900 mb-3">Rubrics</h3>
          {isTeacher && (
            <div className="flex flex-col gap-2">
              {rubrics.length < 3 ? (
                <>
                  <Button 
                    onClick={() => setShowAIRubricGenerator(true)}
                    size="sm"
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md"
                  >
                    <Sparkles className="w-4 h-4" />
                    AI Generate Rubric
                  </Button>
                  <Button 
                    onClick={() => setShowRubricBuilder(true)}
                    size="sm"
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-md"
                  >
                    <FileText className="w-4 h-4" />
                    Manual Builder
                  </Button>
                </>
              ) : (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    Maximum 3 rubrics reached. Delete one to create a new rubric.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {(saveSuccess || publishSuccess) && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            {saveSuccess && 'Rubric saved as draft!'}
            {publishSuccess && 'Rubric published successfully!'}
          </div>
        )}

        {/* Active Rubric Display */}
        {selectedRubric && (
          <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-medium text-green-900">Active: {selectedRubric.name}</span>
                <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                  selectedRubric.type === 'AI_GENERATED' 
                    ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                    : 'bg-purple-100 text-purple-700 border border-purple-200'
                }`}>
                  {selectedRubric.type === 'AI_GENERATED' ? 'AI' : 'Manual'}
                </span>
              </div>
              <Button
                onClick={() => handleViewRubric(selectedRubric)}
                size="sm"
                variant="ghost"
                className="text-green-700 hover:bg-green-100"
              >
                <Eye className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Rubrics List */}
        <div className="space-y-2">
          {rubrics.length === 0 ? (
            <div className="text-center py-8 text-purple-500">
              <div className="w-16 h-16 mx-auto mb-3 bg-purple-100 rounded-full flex items-center justify-center">
                <FileText className="w-8 h-8 text-purple-400" />
              </div>
              <p className="text-sm font-medium">No rubrics created yet</p>
              {isTeacher && (
                <p className="text-xs mt-1 text-purple-400">Create a rubric to get started</p>
              )}
            </div>
          ) : (
            rubrics.map((rubric) => (
              <div
                key={rubric.id}
                className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                  rubric.isActive 
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-sm' 
                    : 'bg-white border-purple-200 hover:bg-purple-50 hover:border-purple-300'
                }`}
                onDoubleClick={() => handleViewRubric(rubric)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                  {renamingRubric?.id === rubric.id ? (
                    <input
                      type="text"
                      value={renamingRubric.name}
                      onChange={(e) => setRenamingRubric({ ...renamingRubric, name: e.target.value })}
                      onBlur={() => handleRenameRubric(rubric.id, renamingRubric.name)}
                      onKeyPress={(e) => e.key === 'Enter' && handleRenameRubric(rubric.id, renamingRubric.name)}
                      className="font-medium text-purple-900 border border-purple-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      autoFocus
                    />
                  ) : (
                    <span className="font-medium text-purple-900">{rubric.name}</span>
                  )}
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                    rubric.type === 'AI_GENERATED' 
                      ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                      : 'bg-purple-100 text-purple-700 border border-purple-200'
                  }`}>
                    {rubric.type === 'AI_GENERATED' ? 'AI' : 'Manual'}
                  </span>
                  {rubric.isActive && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium border border-green-200">
                      Active
                    </span>
                  )}
                </div>
                    <div className="text-xs text-purple-500">
                      Created: {new Date(rubric.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  
                  {isTeacher && (
                    <div className="flex gap-1">
                      {!rubric.isActive && (
                        <Button
                          onClick={() => handleActivateRubric(rubric.id)}
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-200 hover:bg-green-50 hover:border-green-300"
                        >
                          Activate
                        </Button>
                      )}
                      
                      {/* Dropdown Menu */}
                      <div className="relative" ref={dropdownRef}>
                        <Button
                          onClick={() => setShowDropdown(showDropdown === rubric.id ? null : rubric.id)}
                          size="sm"
                          variant="ghost"
                          className="text-gray-600 hover:bg-gray-100"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                        
                        {showDropdown === rubric.id && (
                          <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  setRenamingRubric({ id: rubric.id, name: rubric.name })
                                  setShowDropdown(null)
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <Edit className="w-4 h-4" />
                                Rename
                              </button>
                              <button
                                onClick={() => {
                                  handleEditRubric(rubric)
                                  setShowDropdown(null)
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <Edit className="w-4 h-4" />
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  handleDeleteRubric(rubric.id)
                                  setShowDropdown(null)
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Quick Stats */}
        {rubrics.length > 0 && (
          <div className="mt-4 pt-3 border-t border-purple-200">
            <div className="flex justify-between text-xs text-purple-600">
              <span className="font-medium">{rubrics.length}/3 rubric{rubrics.length !== 1 ? 's' : ''}</span>
              <span className="font-medium">{selectedRubric ? '1 active' : 'No active rubric'}</span>
            </div>
          </div>
        )}
      </div>

      {/* AI Rubric Generator Modal */}
      {showAIRubricGenerator && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-gray-100">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">AI Rubric Generation</h3>
                    <p className="text-blue-100 text-sm">Upload images to generate a rubric</p>
                  </div>
                </div>
                <Button onClick={handleCancelModals} variant="ghost" size="sm" className="text-white hover:bg-white/20">
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
            <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
              <AIRubricGenerator
                courseId={courseId}
                assignmentId={assignmentId}
                assignmentMaxScore={assignmentMaxScore}
                onSuccess={handleAIRubricSuccess}
                onCancel={handleCancelModals}
              />
            </div>
          </div>
        </div>
      )}

      {/* Rubric Builder Modal */}
      {showRubricBuilder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden border border-gray-100">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {editingRubric ? 'Edit Rubric' : 'Rubric Builder'}
                    </h3>
                    <p className="text-purple-100 text-sm">
                      {editingRubric ? 'Modify your rubric structure' : 'Create a custom rubric'}
                    </p>
                  </div>
                </div>
                <Button onClick={handleCancelModals} variant="ghost" size="sm" className="text-white hover:bg-white/20">
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
            <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
              <RubricBuilder
                initialContent={editingRubric ? editingRubric.content : formData.content}
                onSave={handleSaveRubric}
                onPublish={handlePublishRubric}
                onCancel={handleCancelModals}
                assignmentMaxScore={assignmentMaxScore}
                editingRubric={editingRubric}
                saving={saving}
                publishing={publishing}
              />
            </div>
          </div>
        </div>
      )}

      {/* Rubric Viewer Modal */}
      {showRubricViewer && viewingRubric && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-100">
            <div className="bg-gradient-to-r from-gray-600 to-gray-700 p-6 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Eye className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{viewingRubric.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        viewingRubric.type === 'AI_GENERATED' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {viewingRubric.type === 'AI_GENERATED' ? 'AI Generated' : 'Manual'}
                      </span>
                      {viewingRubric.isActive && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Button onClick={handleCancelModals} variant="ghost" size="sm" className="text-white hover:bg-white/20">
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
            <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  Rubric Structure
                </h4>
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <pre className="whitespace-pre-wrap p-6 text-sm overflow-x-auto bg-gray-50">
                    {JSON.stringify(viewingRubric.content, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
} 