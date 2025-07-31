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

interface RubricViewerProps {
  assignmentId: string
  courseId: string
  onScoreChange: (score: number) => void
  onFeedbackChange: (feedback: string) => void
  onRubricSelectionsChange?: (selections: Set<string>) => void
  currentScore?: number
  currentFeedback?: string
  initialSelections?: Set<string>
}

export function RubricViewer({ 
  assignmentId, 
  courseId, 
  onScoreChange, 
  onFeedbackChange,
  onRubricSelectionsChange,
  currentScore = 0,
  currentFeedback = '',
  initialSelections = new Set()
}: RubricViewerProps) {
  const [activeRubric, setActiveRubric] = useState<Rubric | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checkedItems, setCheckedItems] = useState<Set<string>>(initialSelections)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const [collapsedParts, setCollapsedParts] = useState<Set<string>>(new Set())

  // Update checkedItems when initialSelections changes
  useEffect(() => {
    setCheckedItems(initialSelections)
  }, [initialSelections])

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

  // Generate feedback from checked items
  const generateFeedback = () => {
    if (!activeRubric) return ''
    
    const feedbacks: string[] = []
    
    activeRubric.content.sections.forEach(section => {
      // Section-level items
      const sectionItems = Array.isArray(section.rubricItems) ? section.rubricItems : []
      sectionItems.forEach(item => {
        if (checkedItems.has(item.id) && item.feedback) {
          feedbacks.push(item.feedback)
        }
      })
      
      // Part-level items
      const sectionParts = Array.isArray(section.parts) ? section.parts : []
      sectionParts.forEach(part => {
        const partItems = Array.isArray(part.rubricItems) ? part.rubricItems : []
        partItems.forEach(item => {
          if (checkedItems.has(item.id) && item.feedback) {
            feedbacks.push(item.feedback)
          }
        })
      })
    })
    
    return feedbacks.join('\n\n')
  }

  // Handle item toggle
  const handleItemToggle = (itemId: string) => {
    const newChecked = new Set(checkedItems)
    if (newChecked.has(itemId)) {
      newChecked.delete(itemId)
    } else {
      newChecked.add(itemId)
    }
    setCheckedItems(newChecked)
    
    // Calculate new score and feedback with updated checked items
    let newTotal = 0
    const newFeedbacks: string[] = []
    
    activeRubric?.content.sections.forEach(section => {
      // Section-level items
      const sectionItems = Array.isArray(section.rubricItems) ? section.rubricItems : []
      sectionItems.forEach(item => {
        if (newChecked.has(item.id)) {
          newTotal += item.points
          if (item.feedback) {
            newFeedbacks.push(item.feedback)
          }
        }
      })
      
      // Part-level items
      const sectionParts = Array.isArray(section.parts) ? section.parts : []
      sectionParts.forEach(part => {
        const partItems = Array.isArray(part.rubricItems) ? part.rubricItems : []
        partItems.forEach(item => {
          if (newChecked.has(item.id)) {
            newTotal += item.points
            if (item.feedback) {
              newFeedbacks.push(item.feedback)
            }
          }
        })
      })
    })
    
    // Update score and feedback immediately
    onScoreChange(newTotal)
    onFeedbackChange(newFeedbacks.join('\n\n'))
    
    // Notify parent of rubric selections change
    onRubricSelectionsChange?.(newChecked)
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
        <p>No active rubric found</p>
        <p className="text-xs mt-1">Please activate a rubric in the assignment settings</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Rubric Header */}
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
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
          Score: {calculateScore()} pts
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
                      <div key={item.id} className="flex items-start gap-3 p-2 bg-purple-50 rounded-lg">
                        <button
                          onClick={() => handleItemToggle(item.id)}
                          className={`flex-shrink-0 w-4 h-4 rounded border-2 mt-0.5 transition-colors ${
                            checkedItems.has(item.id)
                              ? 'bg-purple-600 border-purple-600 text-white'
                              : 'border-purple-300 hover:border-purple-400'
                          }`}
                        >
                          {checkedItems.has(item.id) && <Check className="w-3 h-3" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-purple-900">{item.title}</span>
                            <span className="text-sm font-bold text-purple-700">{item.points} pts</span>
                          </div>
                          {item.feedback && (
                            <p className="text-xs text-purple-600">{item.feedback}</p>
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
                          <div key={item.id} className="flex items-start gap-3 p-2 bg-white rounded-lg">
                            <button
                              onClick={() => handleItemToggle(item.id)}
                              className={`flex-shrink-0 w-4 h-4 rounded border-2 mt-0.5 transition-colors ${
                                checkedItems.has(item.id)
                                  ? 'bg-blue-600 border-blue-600 text-white'
                                  : 'border-blue-300 hover:border-blue-400'
                              }`}
                            >
                              {checkedItems.has(item.id) && <Check className="w-3 h-3" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-blue-900">{item.title}</span>
                                <span className="text-sm font-bold text-blue-700">{item.points} pts</span>
                              </div>
                              {item.feedback && (
                                <p className="text-xs text-blue-600">{item.feedback}</p>
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

      {/* Quick Actions */}
      <div className="flex gap-2 pt-2 border-t border-purple-200">
        <button
          onClick={() => {
            const allItems = new Set<string>()
            let newTotal = 0
            const newFeedbacks: string[] = []
            
            activeRubric.content.sections.forEach(section => {
              const sectionItems = Array.isArray(section.rubricItems) ? section.rubricItems : []
              sectionItems.forEach(item => {
                allItems.add(item.id)
                newTotal += item.points
                if (item.feedback) {
                  newFeedbacks.push(item.feedback)
                }
              })
              const sectionParts = Array.isArray(section.parts) ? section.parts : []
              sectionParts.forEach(part => {
                const partItems = Array.isArray(part.rubricItems) ? part.rubricItems : []
                partItems.forEach(item => {
                  allItems.add(item.id)
                  newTotal += item.points
                  if (item.feedback) {
                    newFeedbacks.push(item.feedback)
                  }
                })
              })
            })
            setCheckedItems(allItems)
            onScoreChange(newTotal)
            onFeedbackChange(newFeedbacks.join('\n\n'))
            onRubricSelectionsChange?.(allItems)
          }}
          className="flex-1 px-3 py-2 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Check All
        </button>
        <button
          onClick={() => {
            const emptySet = new Set<string>()
            setCheckedItems(emptySet)
            onScoreChange(0)
            onFeedbackChange('')
            onRubricSelectionsChange?.(emptySet)
          }}
          className="flex-1 px-3 py-2 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Uncheck All
        </button>
      </div>
    </div>
  )
} 