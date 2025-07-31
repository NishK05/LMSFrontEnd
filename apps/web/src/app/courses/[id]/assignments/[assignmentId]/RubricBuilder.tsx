"use client"

import { useState } from 'react'
import { Button } from '@lms/ui'
import { Plus, Trash2, Edit, Save, X, Send } from 'lucide-react'

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

interface RubricBuilderProps {
  initialContent?: { sections: RubricSection[] }
  onSave: (content: { sections: RubricSection[] }) => void
  onPublish: (content: { sections: RubricSection[] }) => void
  onCancel: () => void
  assignmentMaxScore: number
  editingRubric?: {
    id: string
    name: string
    content: any
  } | null
  saving?: boolean
  publishing?: boolean
}

export function RubricBuilder({ 
  initialContent, 
  onSave, 
  onPublish,
  onCancel, 
  assignmentMaxScore,
  editingRubric,
  saving = false,
  publishing = false
}: RubricBuilderProps) {
  const [sections, setSections] = useState<RubricSection[]>(
    initialContent?.sections || [{ id: 'section-0', title: 'Section 1', rubricItems: [], parts: [] }]
  )
  const [rubricName, setRubricName] = useState(editingRubric?.name || '')

  const [editingItem, setEditingItem] = useState<{
    sectionId: string
    partId?: string
    itemId: string
    item: RubricItem
  } | null>(null)

  const [editingSection, setEditingSection] = useState<{ id: string; title: string } | null>(null)
  const [editingPart, setEditingPart] = useState<{ sectionId: string; id: string; title: string } | null>(null)

  // Calculate total points
  const calculateTotalPoints = () => {
    return sections.reduce((total, section) => {
      let sectionTotal = 0
      
      // Add section-level items
      sectionTotal += (section.rubricItems || []).reduce((sum, item) => sum + item.points, 0)
      
      // Add part-level items
      sectionTotal += (section.parts || []).reduce((partSum, part) => {
        return partSum + (part.rubricItems || []).reduce((itemSum, item) => itemSum + item.points, 0)
      }, 0)
      
      return total + sectionTotal
    }, 0)
  }

  const totalPoints = calculateTotalPoints()
  const isValid = Math.abs(totalPoints - assignmentMaxScore) < 0.01

  // Section management
  const addSection = () => {
    const newId = `section-${sections.length}`
    setSections([...sections, { id: newId, title: `Section ${sections.length + 1}`, rubricItems: [], parts: [] }])
  }

  const updateSectionTitle = (sectionId: string, title: string) => {
    setSections(sections.map(s => s.id === sectionId ? { ...s, title } : s))
  }

  const deleteSection = (sectionId: string) => {
    if (sections.length > 1) {
      setSections(sections.filter(s => s.id !== sectionId))
    }
  }

  // Part management
  const addPart = (sectionId: string) => {
    setSections(sections.map(section => {
      if (section.id === sectionId) {
        const parts = section.parts || []
        const newPartId = `part-${sectionId}-${parts.length}`
        return {
          ...section,
          parts: [...parts, { id: newPartId, title: `Part ${parts.length + 1}`, rubricItems: [] }]
        }
      }
      return section
    }))
  }

  const updatePartTitle = (sectionId: string, partId: string, title: string) => {
    setSections(sections.map(section => {
      if (section.id === sectionId) {
        return {
          ...section,
          parts: (section.parts || []).map(part => part.id === partId ? { ...part, title } : part)
        }
      }
      return section
    }))
  }

  const deletePart = (sectionId: string, partId: string) => {
    setSections(sections.map(section => {
      if (section.id === sectionId) {
        return {
          ...section,
          parts: (section.parts || []).filter(part => part.id !== partId)
        }
      }
      return section
    }))
  }

  // Item management
  const addItem = (sectionId: string, partId?: string) => {
    const newItem: RubricItem = {
      id: `item-${sectionId}-${partId || 'section'}-${Date.now()}`,
      title: 'New Item',
      points: 0,
      feedback: ''
    }

    setSections(sections.map(section => {
      if (section.id === sectionId) {
        if (partId) {
          // Add to part
          return {
            ...section,
            parts: (section.parts || []).map(part => 
              part.id === partId 
                ? { ...part, rubricItems: [...(part.rubricItems || []), newItem] }
                : part
            )
          }
        } else {
          // Add to section
          return {
            ...section,
            rubricItems: [...(section.rubricItems || []), newItem]
          }
        }
      }
      return section
    }))
  }

  const updateItem = (sectionId: string, partId: string | undefined, itemId: string, updates: Partial<RubricItem>) => {
    setSections(sections.map(section => {
      if (section.id === sectionId) {
        if (partId) {
          // Update part item
          return {
            ...section,
            parts: (section.parts || []).map(part => 
              part.id === partId 
                ? { 
                    ...part, 
                    rubricItems: (part.rubricItems || []).map(item => 
                      item.id === itemId ? { ...item, ...updates } : item
                    )
                  }
                : part
            )
          }
        } else {
          // Update section item
          return {
            ...section,
            rubricItems: (section.rubricItems || []).map(item => 
              item.id === itemId ? { ...item, ...updates } : item
            )
          }
        }
      }
      return section
    }))
  }

  const deleteItem = (sectionId: string, partId: string | undefined, itemId: string) => {
    setSections(sections.map(section => {
      if (section.id === sectionId) {
        if (partId) {
          // Delete from part
          return {
            ...section,
            parts: (section.parts || []).map(part => 
              part.id === partId 
                ? { ...part, rubricItems: (part.rubricItems || []).filter(item => item.id !== itemId) }
                : part
            )
          }
        } else {
          // Delete from section
          return {
            ...section,
            rubricItems: (section.rubricItems || []).filter(item => item.id !== itemId)
          }
        }
      }
      return section
    }))
  }

  const handleSave = () => {
    if (!rubricName.trim()) {
      alert('Rubric name is required')
      return
    }
    
    if (!isValid) {
      alert(`Total points (${totalPoints}) must equal assignment points (${assignmentMaxScore})`)
      return
    }
    onSave({ sections })
  }

  const handlePublish = () => {
    if (!rubricName.trim()) {
      alert('Rubric name is required')
      return
    }
    
    if (!isValid) {
      alert(`Total points (${totalPoints}) must equal assignment points (${assignmentMaxScore})`)
      return
    }
    onPublish({ sections })
  }

  return (
    <div className="space-y-6">
      {/* Points Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${isValid ? 'text-green-600' : 'text-red-600'}`}>
              Points: {totalPoints} / {assignmentMaxScore}
            </span>
            <Button onClick={addSection} size="sm" variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50">
              <Plus className="w-4 h-4 mr-1" />
              Add Section
            </Button>
          </div>
        </div>
      </div>

      {/* Rubric Name Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Rubric Name *
        </label>
        <input
          type="text"
          value={rubricName}
          onChange={(e) => setRubricName(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
          placeholder="Enter rubric name"
        />
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section, sectionIndex) => (
          <div key={section.id} className="border border-purple-200 rounded-xl p-6 bg-white shadow-sm">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {editingSection?.id === section.id ? (
                  <input
                    type="text"
                    value={editingSection.title}
                    onChange={(e) => setEditingSection({ ...editingSection, title: e.target.value })}
                    onBlur={() => {
                      updateSectionTitle(section.id, editingSection.title)
                      setEditingSection(null)
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && setEditingSection(null)}
                    className="font-semibold text-purple-900 border border-purple-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    autoFocus
                  />
                ) : (
                  <h4 
                    className="font-semibold text-purple-900 cursor-pointer hover:bg-purple-50 px-3 py-2 rounded-lg transition-colors"
                    onClick={() => setEditingSection({ id: section.id, title: section.title })}
                  >
                    {section.title}
                  </h4>
                )}
                <Button
                  onClick={() => addItem(section.id)}
                  size="sm"
                  variant="ghost"
                  className="text-purple-600 hover:bg-purple-100"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Item
                </Button>
                <Button
                  onClick={() => addPart(section.id)}
                  size="sm"
                  variant="ghost"
                  className="text-blue-600 hover:bg-blue-100"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Part
                </Button>
              </div>
              {sections.length > 1 && (
                <Button
                  onClick={() => deleteSection(section.id)}
                  size="sm"
                  variant="ghost"
                  className="text-red-500 hover:bg-red-100"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Section Items */}
            {section.rubricItems.length > 0 && (
              <div className="mb-4">
                <h5 className="text-sm font-medium text-purple-700 mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  Section Items
                </h5>
                <div className="space-y-2">
                  {section.rubricItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => updateItem(section.id, undefined, item.id, { title: e.target.value })}
                        className="flex-1 text-sm border border-purple-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Item title"
                      />
                      <input
                        type="number"
                        value={item.points}
                        onChange={(e) => updateItem(section.id, undefined, item.id, { points: Number(e.target.value) })}
                        className="w-20 text-sm border border-purple-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        min="0"
                        step="0.5"
                      />
                      <input
                        type="text"
                        value={item.feedback}
                        onChange={(e) => updateItem(section.id, undefined, item.id, { feedback: e.target.value })}
                        className="flex-1 text-sm border border-purple-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Feedback"
                      />
                      <Button
                        onClick={() => deleteItem(section.id, undefined, item.id)}
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:bg-red-100"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Parts */}
            {(section.parts || []).map((part, partIndex) => (
              <div key={part.id} className="border border-blue-200 rounded-xl p-4 bg-blue-50 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {editingPart?.id === part.id ? (
                      <input
                        type="text"
                        value={editingPart.title}
                        onChange={(e) => setEditingPart({ ...editingPart, title: e.target.value })}
                        onBlur={() => {
                          updatePartTitle(section.id, part.id, editingPart.title)
                          setEditingPart(null)
                        }}
                        onKeyPress={(e) => e.key === 'Enter' && setEditingPart(null)}
                        className="font-medium text-blue-900 border border-blue-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                    ) : (
                      <h6 
                        className="font-medium text-blue-900 cursor-pointer hover:bg-blue-100 px-3 py-2 rounded-lg transition-colors"
                        onClick={() => setEditingPart({ sectionId: section.id, id: part.id, title: part.title })}
                      >
                        {part.title}
                      </h6>
                    )}
                    <Button
                      onClick={() => addItem(section.id, part.id)}
                      size="sm"
                      variant="ghost"
                      className="text-blue-600 hover:bg-blue-100"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Item
                    </Button>
                  </div>
                  <Button
                    onClick={() => deletePart(section.id, part.id)}
                    size="sm"
                    variant="ghost"
                    className="text-red-500 hover:bg-red-100"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>

                {/* Part Items */}
                <div className="space-y-2">
                  {part.rubricItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-200">
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => updateItem(section.id, part.id, item.id, { title: e.target.value })}
                        className="flex-1 text-sm border border-blue-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Item title"
                      />
                      <input
                        type="number"
                        value={item.points}
                        onChange={(e) => updateItem(section.id, part.id, item.id, { points: Number(e.target.value) })}
                        className="w-20 text-sm border border-blue-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                        step="0.5"
                      />
                      <input
                        type="text"
                        value={item.feedback}
                        onChange={(e) => updateItem(section.id, part.id, item.id, { feedback: e.target.value })}
                        className="flex-1 text-sm border border-blue-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Feedback"
                      />
                      <Button
                        onClick={() => deleteItem(section.id, part.id, item.id)}
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:bg-red-100"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          {isValid ? (
            <span className="text-green-600 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Points match assignment total
            </span>
          ) : (
            <span className="text-red-600 flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              Points must equal {assignmentMaxScore}
            </span>
          )}
        </div>
        <div className="flex gap-3">
          <Button onClick={onCancel} variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50">
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!isValid || !rubricName.trim() || saving || publishing}
            className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-md"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {editingRubric ? 'Update' : 'Save'} as Draft
              </>
            )}
          </Button>
          <Button 
            onClick={handlePublish} 
            disabled={!isValid || !rubricName.trim() || saving || publishing}
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-md"
          >
            {publishing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Publishing...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Publish Rubric
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
} 