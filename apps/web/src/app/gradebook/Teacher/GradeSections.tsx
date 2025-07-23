"use client"
import { useEffect, useState } from 'react'
import { GradebookCourse, GradeSection } from '../types'
import { getSections, saveSections, getLatePenalty, saveLatePenalty } from '../api'
import { getLetterGrades, saveLetterGrades } from '../api'
import { getRounding, saveRounding } from '../api'
import { LetterGradeSplit } from '../types'
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
  const [gradebookStyle, setGradebookStyle] = useState<'standard' | 'test'>('standard')
  const [letterGradesEnabled, setLetterGradesEnabled] = useState(false)
  const [letterGradeSplits, setLetterGradeSplits] = useState<LetterGradeSplit[]>([])
  const [letterGradeSaving, setLetterGradeSaving] = useState(false)
  const [letterGradeError, setLetterGradeError] = useState('')
  const [letterGradeSuccess, setLetterGradeSuccess] = useState(false)
  const [newLetterLabel, setNewLetterLabel] = useState('')
  const [newLetterMin, setNewLetterMin] = useState<number | ''>('')
  const [roundingEnabled, setRoundingEnabled] = useState(false)
  const [rounding, setRounding] = useState<number>(2)
  const [roundingSaving, setRoundingSaving] = useState(false)
  const [roundingError, setRoundingError] = useState('')
  const [roundingSuccess, setRoundingSuccess] = useState(false)

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

  // Fetch letter grades on mount
  useEffect(() => {
    if (!letterGradesEnabled) return
    getLetterGrades(course.id)
      .then(splits => setLetterGradeSplits(splits.sort((a, b) => b.minPercent - a.minPercent)))
      .catch(() => setLetterGradeError('Failed to fetch letter grades'))
  }, [course.id, letterGradesEnabled])

  // Fetch rounding on mount
  useEffect(() => {
    if (!roundingEnabled) return
    getRounding(course.id)
      .then(val => setRounding(val))
      .catch(() => setRoundingError('Failed to fetch rounding'))
  }, [course.id, roundingEnabled])

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

  const handleAddLetterGrade = () => {
    if (!newLetterLabel.trim() || newLetterMin === '' || isNaN(Number(newLetterMin))) return
    setLetterGradeSplits(prev => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        courseId: course.id,
        label: newLetterLabel.trim(),
        minPercent: Number(newLetterMin),
        order: prev.length + 1,
        createdAt: '',
        updatedAt: '',
      }
    ].sort((a, b) => b.minPercent - a.minPercent))
    setNewLetterLabel('')
    setNewLetterMin('')
  }

  const handleDeleteLetterGrade = (i: number) => {
    setLetterGradeSplits(prev => prev.filter((_, idx) => idx !== i))
  }

  const handleLetterLabelChange = (i: number, label: string) => {
    setLetterGradeSplits(prev => prev.map((s, idx) => idx === i ? { ...s, label } : s))
  }
  const handleLetterMinChange = (i: number, min: number) => {
    setLetterGradeSplits(prev => prev.map((s, idx) => idx === i ? { ...s, minPercent: min } : s).sort((a, b) => b.minPercent - a.minPercent))
  }

  const handleSaveLetterGrades = async () => {
    setLetterGradeSaving(true)
    setLetterGradeError('')
    setLetterGradeSuccess(false)
    try {
      const updated = await saveLetterGrades(course.id, letterGradeSplits)
      setLetterGradeSplits(updated.sort((a, b) => b.minPercent - a.minPercent))
      setLetterGradeSuccess(true)
    } catch (e: any) {
      setLetterGradeError(e.message || 'Failed to save letter grades')
    }
    setLetterGradeSaving(false)
  }

  const handleSaveRounding = async () => {
    setRoundingSaving(true)
    setRoundingError('')
    setRoundingSuccess(false)
    try {
      const updated = await saveRounding(course.id, rounding)
      setRounding(updated.rounding)
      setRoundingSuccess(true)
    } catch (e: any) {
      setRoundingError(e.message || 'Failed to save rounding')
    }
    setRoundingSaving(false)
  }

  return (
    <div>
      <div className="mb-4">
        <label className="font-semibold mr-2">Gradebook Style:</label>
        <select
          className="border rounded px-2 py-1"
          value={gradebookStyle}
          onChange={e => setGradebookStyle(e.target.value as 'standard' | 'test')}
        >
          <option value="standard">Standard 0-100 Scale</option>
          <option value="test">Test (Empty)</option>
        </select>
      </div>
      {gradebookStyle === 'standard' && (
        <>
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
              {/* Letter Grades Enable Checkbox and Splits UI moved here */}
              <div className="mt-8 mb-4">
                <label className="font-semibold mr-2">
                  <input
                    type="checkbox"
                    checked={letterGradesEnabled}
                    onChange={e => setLetterGradesEnabled(e.target.checked)}
                    className="mr-2"
                  />
                  Enable Letter Grades
                </label>
              </div>
              {letterGradesEnabled && (
                <div className="mb-8">
                  <h4 className="font-semibold mb-2">Letter Grade Splits</h4>
                  <ul className="space-y-2 mb-4">
                    {letterGradeSplits.map((split, i) => (
                      <li key={split.id} className="flex items-center gap-3">
                        <input
                          className="border rounded px-2 py-1 w-20"
                          value={split.label}
                          onChange={e => handleLetterLabelChange(i, e.target.value)}
                          placeholder="Label (e.g. A+)"
                        />
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={split.minPercent}
                          onChange={e => handleLetterMinChange(i, Number(e.target.value))}
                          className="w-20 border rounded px-1"
                          placeholder="Min %"
                        />
                        <span className="text-xs text-purple-500">min %</span>
                        <button className="text-red-500 ml-2" onClick={() => handleDeleteLetterGrade(i)}>Delete</button>
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center gap-2 mb-4">
                    <input
                      className="border rounded px-2 py-1 w-20"
                      value={newLetterLabel}
                      onChange={e => setNewLetterLabel(e.target.value)}
                      placeholder="Label (e.g. A+)"
                    />
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={newLetterMin}
                      onChange={e => setNewLetterMin(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-20 border rounded px-1"
                      placeholder="Min %"
                    />
                    <button className="bg-purple-600 text-white px-3 py-1 rounded" onClick={handleAddLetterGrade} disabled={!newLetterLabel.trim() || newLetterMin === ''}>Add</button>
                  </div>
                  <button
                    className="bg-purple-700 text-white px-4 py-2 rounded mt-2 disabled:opacity-50"
                    onClick={handleSaveLetterGrades}
                    disabled={letterGradeSaving || letterGradeSplits.length === 0}
                  >
                    {letterGradeSaving ? 'Saving...' : 'Save Letter Grades'}
                  </button>
                  {letterGradeError && <div className="text-red-600 mt-2">{letterGradeError}</div>}
                  {letterGradeSuccess && <div className="text-green-600 mt-2">Letter grades saved!</div>}
                </div>
              )}
              {/* Rounding Option */}
              <div className="mt-8 mb-4">
                <label className="font-semibold mr-2">
                  <input
                    type="checkbox"
                    checked={roundingEnabled}
                    onChange={e => setRoundingEnabled(e.target.checked)}
                    className="mr-2"
                  />
                  Change Rounding
                </label>
              </div>
              {roundingEnabled && (
                <div className="mb-8 flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={5}
                    value={rounding}
                    onChange={e => setRounding(Number(e.target.value))}
                    className="w-20 border rounded px-1"
                    placeholder="Decimal places"
                  />
                  <span className="text-xs text-purple-500">decimal places</span>
                  <button
                    className="bg-purple-700 text-white px-3 py-1 rounded disabled:opacity-50"
                    onClick={handleSaveRounding}
                    disabled={roundingSaving}
                  >
                    {roundingSaving ? 'Saving...' : 'Save Rounding'}
                  </button>
                  {roundingError && <div className="text-red-600 ml-2">{roundingError}</div>}
                  {roundingSuccess && <div className="text-green-600 ml-2">Rounding saved!</div>}
                </div>
              )}
            </>
          )}
        </>
      )}
      {gradebookStyle === 'test' && (
        <div className="text-purple-400 text-lg mt-8">Test grading style selected. All gradebook configuration is hidden.</div>
      )}
    </div>
  )
} 