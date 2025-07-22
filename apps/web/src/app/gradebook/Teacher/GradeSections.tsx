"use client"
import { useEffect, useState } from 'react'
import { GradebookCourse, GradeSection } from '../types'
import { getSections } from '../api'

export function GradeSections({ course }: { course: GradebookCourse }) {
  const [sections, setSections] = useState<GradeSection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newName, setNewName] = useState('')
  const [newWeight, setNewWeight] = useState(0)
  const [saving, setSaving] = useState(false)

  // Fetch sections on mount
  useEffect(() => {
    setLoading(true)
    getSections(course.id)
      .then(data => setSections(data))
      .catch(() => setError('Failed to fetch sections'))
      .finally(() => setLoading(false))
  }, [course.id])

  // Calculate total weight
  const totalWeight = sections.reduce((sum, s) => sum + s.weight, 0)

  // Handlers for editing
  const handleNameChange = (i: number, name: string) => {
    setSections(sections => sections.map((s, idx) => idx === i ? { ...s, name } : s))
  }
  const handleWeightChange = (i: number, weight: number) => {
    setSections(sections => sections.map((s, idx) => idx === i ? { ...s, weight } : s))
  }
  const handleDelete = (i: number) => {
    setSections(sections => sections.filter((_, idx) => idx !== i))
  }
  const handleAdd = () => {
    if (!newName.trim() || newWeight <= 0) return
    setSections([...sections, {
      id: `new-${Date.now()}`,
      courseId: course.id,
      name: newName.trim(),
      weight: newWeight,
      order: sections.length + 1,
      createdAt: '',
      updatedAt: '',
    }])
    setNewName('')
    setNewWeight(0)
  }

  // TODO: Implement save logic (API call)
  const handleSave = async () => {
    setSaving(true)
    // await saveSections(course.id, sections)
    setSaving(false)
  }

  return (
    <div>
      <h3 className="font-bold text-lg mb-2">Grade Categories</h3>
      {loading ? (
        <div className="text-purple-400">Loading...</div>
      ) : (
        <>
          <ul className="space-y-3 mb-4">
            {sections.map((section, i) => (
              <li key={section.id} className="flex items-center gap-3">
                <input
                  className="border rounded px-2 py-1 w-40"
                  value={section.name}
                  onChange={e => handleNameChange(i, e.target.value)}
                  placeholder="Category name"
                />
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={section.weight}
                  onChange={e => handleWeightChange(i, Number(e.target.value))}
                  className="w-32"
                />
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={section.weight}
                  onChange={e => handleWeightChange(i, Number(e.target.value))}
                  className="w-16 border rounded px-1"
                />
                <span className="text-xs text-purple-500">%</span>
                <button className="text-red-500 ml-2" onClick={() => handleDelete(i)}>Delete</button>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2 mb-4">
            <input
              className="border rounded px-2 py-1 w-40"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="New category"
            />
            <input
              type="number"
              min={0}
              max={100}
              value={newWeight}
              onChange={e => setNewWeight(Number(e.target.value))}
              className="w-16 border rounded px-1"
              placeholder="%"
            />
            <button className="bg-purple-600 text-white px-3 py-1 rounded" onClick={handleAdd} disabled={!newName.trim() || newWeight <= 0}>Add</button>
          </div>
          <div className="font-semibold mb-2">Total: <span className={totalWeight === 100 ? 'text-green-600' : 'text-red-600'}>{totalWeight}%</span></div>
          <button
            className="bg-purple-700 text-white px-4 py-2 rounded mt-2 disabled:opacity-50"
            onClick={handleSave}
            disabled={totalWeight !== 100 || saving}
          >
            {saving ? 'Saving...' : 'Save Categories'}
          </button>
          {error && <div className="text-red-600 mt-2">{error}</div>}
        </>
      )}
    </div>
  )
} 