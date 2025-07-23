"use client"
import { useEffect, useState } from 'react'
import { GradebookCourse, GradeSection } from '../types'
import { getSections, saveSections, getLatePenalty, saveLatePenalty } from '../api'
import { useGradebookContext } from '../GradebookContext'

export function GradeSections({ course }: { course: GradebookCourse }) {
  const { sections: contextSections, setSections } = useGradebookContext()
  const [sections, setLocalSections] = useState<GradeSection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newName, setNewName] = useState('')
  const [newWeight, setNewWeight] = useState(0)
  const [saving, setSaving] = useState(false)
  const [latePenalty, setLatePenalty] = useState<number | null>(null)
  const [latePenaltySaving, setLatePenaltySaving] = useState(false)
  const [latePenaltyError, setLatePenaltyError] = useState('')

  // Fetch sections and late penalty on mount
  useEffect(() => {
    setLoading(true)
    Promise.all([
      getSections(course.id),
      getLatePenalty(course.id)
    ])
      .then(([sectionsData, penalty]) => {
        setLocalSections(sectionsData)
        setSections(sectionsData) // update context on load
        setLatePenalty(penalty)
      })
      .catch(() => setError('Failed to fetch sections or late penalty'))
      .finally(() => setLoading(false))
  }, [course.id, setSections])

  // Calculate total weight
  const totalWeight = sections.reduce((sum, s) => sum + s.weight, 0)

  // Handlers for editing
  const handleNameChange = (i: number, name: string) => {
    setLocalSections((prev: GradeSection[]) => prev.map((s, idx) => idx === i ? { ...s, name } : s))
  }
  const handleWeightChange = (i: number, weight: number) => {
    setLocalSections((prev: GradeSection[]) => prev.map((s, idx) => idx === i ? { ...s, weight } : s))
  }
  const handleDelete = (i: number) => {
    setLocalSections((prev: GradeSection[]) => prev.filter((_, idx) => idx !== i))
  }
  const handleAdd = () => {
    if (!newName.trim() || newWeight <= 0) return
    setLocalSections((prev: GradeSection[]) => [...prev, {
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

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const updated = await saveSections(course.id, sections)
      setLocalSections(updated)
      setSections(updated) // update context after save
    } catch (e: any) {
      setError(e.message || 'Failed to save sections')
    }
    setSaving(false)
  }

  const handleLatePenaltySave = async () => {
    setLatePenaltySaving(true)
    setLatePenaltyError('')
    try {
      const updated = await saveLatePenalty(course.id, latePenalty ?? 0)
      setLatePenalty(updated.latePenalty)
    } catch (e: any) {
      setLatePenaltyError(e.message || 'Failed to save late penalty')
    }
    setLatePenaltySaving(false)
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
          <div className="mt-8">
            <h4 className="font-semibold mb-2">Late Penalty (%)</h4>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                value={latePenalty ?? ''}
                onChange={e => setLatePenalty(Number(e.target.value))}
                className="w-20 border rounded px-2 py-1"
                placeholder="%"
              />
              <button
                className="bg-purple-700 text-white px-3 py-1 rounded disabled:opacity-50"
                onClick={handleLatePenaltySave}
                disabled={latePenaltySaving || latePenalty === null}
              >
                {latePenaltySaving ? 'Saving...' : 'Save Penalty'}
              </button>
            </div>
            {latePenaltyError && <div className="text-red-600 mt-2">{latePenaltyError}</div>}
          </div>
        </>
      )}
    </div>
  )
} 