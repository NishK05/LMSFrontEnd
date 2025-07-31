"use client"

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, Check, X } from 'lucide-react'

interface RubricItem {
  id: string
  title: string
  points: number
  feedback: string
}

interface RubricPart {
  id: string
  title: string
  rubricItems: RubricItem[]
}

interface RubricSection {
  id: string
  title: string
  rubricItems: RubricItem[]
  parts: RubricPart[]
}

interface Rubric {
  id: string
  name: string
  type: 'MANUAL' | 'AI_GENERATED'
  content: {
    sections: RubricSection[]
  }
  isActive: boolean
}

interface StudentRubricViewerProps {
  assignmentId: string
  courseId: string
  rubricSelections?: string[] // Array of checked rubric item IDs from the grade
}

export function StudentRubricViewer({ 
  assignmentId, 
  courseId, 
  rubricSelections = []
}: StudentRubricViewerProps) {
  const [activeRubric, setActiveRubric] = useState<Rubric | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const [collapsedParts, setCollapsedParts] = useState<Set<string>>(new Set())

  // Convert rubricSelections array to Set for easy lookup
  const checkedItems = new Set(rubricSelections)

  // Fetch active rubric
  useEffect(() => {
    const fetchActiveRubric = async () => {
      try {
        const response = await fetch(`/api/gradebook/${courseId}/assignments/${assignmentId}/rubrics`)
        const data = await response.json()
        
        if (data.success) {
          const active = data.data.find((r: Rubric) => r.isActive)
          setActiveRubric(active || null)
        } else {
          setError(data.error || 'Failed to fetch rubric')
        }
      } catch (err) {
        setError('Failed to fetch rubric')
      } finally {
        setLoading(false)
      }
    }

    fetchActiveRubric()
  }, [courseId, assignmentId])

  // Calculate score based on checked items
  const calculateScore = () => {
    if (!activeRubric) return 0
    
    let total = 0
    activeRubric.content.sections.forEach(section => {
      // Section-level items
      const sectionItems = Array.isArray(section.rubricItems) ? section.rubricItems : []
      sectionItems.forEach(item => {
        if (checkedItems.has(item.id)) {
          total += item.points
        }
      })
      
      // Part-level items
      const sectionParts = Array.isArray(section.parts) ? section.parts : []
      sectionParts.forEach(part => {
        const partItems = Array.isArray(part.rubricItems) ? part.rubricItems : []
        partItems.forEach(item => {
          if (checkedItems.has(item.id)) {
            total += item.points
          }
        })
      })
    })
    
    return total
  }

  // Toggle section collapse
  const toggleSection = (sectionId: string) => {
    const newCollapsed = new Set(collapsedSections)
    if (newCollapsed.has(sectionId)) {
      newCollapsed.delete(sectionId)
    } else {
      newCollapsed.add(sectionId)
    }
    setCollapsedSections(newCollapsed)
  }

  // Toggle part collapse
  const togglePart = (partId: string) => {
    const newCollapsed = new Set(collapsedParts)
    if (newCollapsed.has(partId)) {
      newCollapsed.delete(partId)
    } else {
      newCollapsed.add(partId)
    }
    setCollapsedParts(newCollapsed)
  }

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400 mx-auto"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-red-600 text-sm">
        {error}
      </div>
    )
  }

  if (!activeRubric) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        <div className="w-12 h-12 mx-auto mb-2 bg-gray-100 rounded-full flex items-center justify-center">
          <X className="w-6 h-6 text-gray-400" />
        </div>
        <p>No rubric information available</p>
        <p className="text-xs mt-1">Contact your instructor for grading details</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Rubric Header */}
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="font-medium text-purple-900">{activeRubric.name}</span>
          <span className={`px-2 py-1 text-xs rounded-full font-medium ${
            activeRubric.type === 'AI_GENERATED' 
              ? 'bg-blue-100 text-blue-700 border border-blue-200' 
              : 'bg-purple-100 text-purple-700 border border-purple-200'
          }`}>
            {activeRubric.type === 'AI_GENERATED' ? 'AI' : 'Manual'}
          </span>
        </div>
        <div className="text-sm text-purple-600 font-medium">
          Your Score: {calculateScore()} pts
        </div>
      </div>

      {/* Rubric Sections */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {activeRubric.content.sections.map((section) => (
          <div key={section.id} className="border border-purple-200 rounded-lg bg-white">
            {/* Section Header */}
            <div 
              className="flex items-center justify-between p-3 cursor-pointer hover:bg-purple-50 transition-colors"
              onClick={() => toggleSection(section.id)}
            >
              <div className="flex items-center gap-2">
                {collapsedSections.has(section.id) ? (
                  <ChevronRight className="w-4 h-4 text-purple-600" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-purple-600" />
                )}
                <span className="font-medium text-purple-900">{section.title}</span>
              </div>
              <div className="text-sm text-purple-600">
                {(Array.isArray(section.rubricItems) ? section.rubricItems : []).length + 
                 (Array.isArray(section.parts) ? section.parts : []).reduce((sum, part) => 
                   sum + (Array.isArray(part.rubricItems) ? part.rubricItems : []).length, 0)} items
              </div>
            </div>

            {/* Section Content */}
            {!collapsedSections.has(section.id) && (
              <div className="border-t border-purple-100 p-3 space-y-3">
                {/* Section-level items */}
                {(Array.isArray(section.rubricItems) ? section.rubricItems : []).length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-medium text-purple-700 uppercase tracking-wide">
                      Section Items
                    </h5>
                    {(Array.isArray(section.rubricItems) ? section.rubricItems : []).map((item) => (
                      <div key={item.id} className={`flex items-start gap-3 p-2 rounded-lg ${
                        checkedItems.has(item.id) 
                          ? 'bg-green-50 border border-green-200' 
                          : 'bg-red-50 border border-red-200'
                      }`}>
                        <div className={`flex-shrink-0 w-4 h-4 rounded border-2 mt-0.5 flex items-center justify-center ${
                          checkedItems.has(item.id)
                            ? 'bg-green-600 border-green-600 text-white'
                            : 'bg-red-600 border-red-600 text-white'
                        }`}>
                          {checkedItems.has(item.id) ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900">{item.title}</span>
                            <span className={`text-sm font-bold ${
                              checkedItems.has(item.id) ? 'text-green-700' : 'text-red-700'
                            }`}>
                              {checkedItems.has(item.id) ? `+${item.points}` : `+0`} pts
                            </span>
                          </div>
                          {item.feedback && (
                            <p className={`text-xs ${
                              checkedItems.has(item.id) ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {checkedItems.has(item.id) ? '✓ ' : '✗ '}{item.feedback}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Parts */}
                {(Array.isArray(section.parts) ? section.parts : []).map((part) => (
                  <div key={part.id} className="border border-blue-200 rounded-lg bg-blue-50">
                    {/* Part Header */}
                    <div 
                      className="flex items-center justify-between p-2 cursor-pointer hover:bg-blue-100 transition-colors"
                      onClick={() => togglePart(part.id)}
                    >
                      <div className="flex items-center gap-2">
                        {collapsedParts.has(part.id) ? (
                          <ChevronRight className="w-3 h-3 text-blue-600" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-blue-600" />
                        )}
                        <span className="text-sm font-medium text-blue-900">{part.title}</span>
                      </div>
                      <div className="text-xs text-blue-600">
                        {(Array.isArray(part.rubricItems) ? part.rubricItems : []).length} items
                      </div>
                    </div>

                    {/* Part Items */}
                    {!collapsedParts.has(part.id) && (Array.isArray(part.rubricItems) ? part.rubricItems : []).length > 0 && (
                      <div className="border-t border-blue-100 p-2 space-y-2">
                        {(Array.isArray(part.rubricItems) ? part.rubricItems : []).map((item) => (
                          <div key={item.id} className={`flex items-start gap-3 p-2 rounded-lg ${
                            checkedItems.has(item.id) 
                              ? 'bg-green-50 border border-green-200' 
                              : 'bg-red-50 border border-red-200'
                          }`}>
                            <div className={`flex-shrink-0 w-4 h-4 rounded border-2 mt-0.5 flex items-center justify-center ${
                              checkedItems.has(item.id)
                                ? 'bg-green-600 border-green-600 text-white'
                                : 'bg-red-600 border-red-600 text-white'
                            }`}>
                              {checkedItems.has(item.id) ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-gray-900">{item.title}</span>
                                <span className={`text-sm font-bold ${
                                  checkedItems.has(item.id) ? 'text-green-700' : 'text-red-700'
                                }`}>
                                  {checkedItems.has(item.id) ? `+${item.points}` : `+0`} pts
                                </span>
                              </div>
                              {item.feedback && (
                                <p className={`text-xs ${
                                  checkedItems.has(item.id) ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {checkedItems.has(item.id) ? '✓ ' : '✗ '}{item.feedback}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="text-sm text-gray-700">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium">Grading Summary:</span>
            <span className="font-bold text-purple-700">{calculateScore()} points earned</span>
          </div>
          <div className="text-xs text-gray-600">
            ✓ Green items = Points earned | ✗ Red items = Points missed
          </div>
        </div>
      </div>
    </div>
  )
} 