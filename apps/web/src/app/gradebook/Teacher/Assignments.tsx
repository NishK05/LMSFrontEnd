"use client"
import { useEffect, useState } from 'react'
import { GradebookCourse, Assignment, GradeSection } from '../types'
import { getAssignments, saveAssignment, deleteAssignment } from '../api'
import { useGradebookContext } from '../GradebookContext'

export function Assignments({ course }: { course: GradebookCourse }) {
  const { sections, setSections, assignments, setAssignments } = useGradebookContext()
  const [loading, setLoading] = useState(false) // No longer fetches here
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    id: '',
    name: '',
    dueDate: '',
    dueTime: '', // new
    sectionId: '',
    comment: '',
    points: 100, // new
  })
  const [editing, setEditing] = useState(false)

  // Listen for context changes to sections and update the dropdown
  useEffect(() => {
    setForm(f => ({ ...f, sectionId: f.sectionId && sections.find(s => s.id === f.sectionId) ? f.sectionId : '' }))
  }, [sections])

  const resetForm = () => setForm({ id: '', name: '', dueDate: '', dueTime: '', sectionId: '', comment: '', points: 100 })

  const handleEdit = (a: Assignment) => {
    const [date, time] = a.dueDate.split('T')
    setForm({
      id: a.id,
      name: a.name,
      dueDate: date,
      dueTime: time ? time.slice(0,5) : '',
      sectionId: a.sectionId,
      comment: a.description || '',
      points: a.maxScore || 100,
    })
    setEditing(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteAssignment(course.id, id)
      setAssignments(assignments.filter(a => a.id !== id))
    } catch (e: any) {
      setError(e.message || 'Failed to delete assignment')
    }
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.dueDate || !form.sectionId) {
      setError('Name, due date, and section are required')
      return
    }
    setError('')
    const dueDateTime = form.dueTime ? `${form.dueDate}T${form.dueTime}:00` : form.dueDate
    try {
      const saved = await saveAssignment(course.id, {
        id: editing ? form.id : undefined,
        name: form.name,
        dueDate: dueDateTime,
        sectionId: form.sectionId,
        description: form.comment,
        maxScore: form.points,
        type: 'STANDARD',
      })
      if (editing) {
        setAssignments(assignments.map(a => a.id === saved.id ? saved : a))
      } else {
        setAssignments([...assignments, saved])
      }
      resetForm()
      setEditing(false)
    } catch (e: any) {
      setError(e.message || 'Failed to save assignment')
    }
  }

  return (
    <div>
      <h3 className="font-bold text-lg mb-2">Assignments</h3>
      {loading ? (
        <div className="text-purple-400">Loading...</div>
      ) : (
        <>
          <ul className="space-y-3 mb-4">
            {assignments.map(a => (
              <li key={a.id} className="flex items-center gap-3">
                <span className="font-semibold">{a.name}</span>
                <span className="text-xs text-purple-500">{a.dueDate?.split('T')[0]}{a.dueDate?.includes('T') ? ' ' + a.dueDate.split('T')[1].slice(0,5) : ''}</span>
                <span className="text-xs text-purple-500">{sections.find(s => s.id === a.sectionId)?.name || 'No Section'}</span>
                <span className="text-xs text-purple-500">{a.maxScore} pts</span>
                <button className="text-blue-600" onClick={() => handleEdit(a)}>Edit</button>
                <button className="text-red-500" onClick={() => handleDelete(a.id)}>Delete</button>
              </li>
            ))}
          </ul>
          <form className="space-y-2 mb-4" onSubmit={e => { e.preventDefault(); handleSave() }}>
            <div className="flex gap-2 items-center">
              <input
                className="border rounded px-2 py-1"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Assignment name"
              />
              <input
                type="date"
                className="border rounded px-2 py-1"
                value={form.dueDate}
                onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
              />
              <input
                type="time"
                className="border rounded px-2 py-1"
                value={form.dueTime}
                onChange={e => setForm(f => ({ ...f, dueTime: e.target.value }))}
                placeholder="Due time (optional)"
              />
              <select
                className="border rounded px-2 py-1"
                value={form.sectionId}
                onChange={e => setForm(f => ({ ...f, sectionId: e.target.value }))}
                required
              >
                <option value="">Select category</option>
                {sections.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                className="border rounded px-2 py-1 w-20"
                value={form.points}
                onChange={e => setForm(f => ({ ...f, points: Number(e.target.value) }))}
                placeholder="Points"
              />
              <button className="bg-purple-700 text-white px-3 py-1 rounded" type="submit">
                {editing ? 'Update' : 'Add'}
              </button>
              {editing && (
                <button className="ml-2 text-gray-500" type="button" onClick={() => { resetForm(); setEditing(false) }}>Cancel</button>
              )}
            </div>
            {/* Assignment Description textarea below */}
            <div className="flex flex-col gap-1">
              <label htmlFor="assignment-description" className="font-medium text-sm">Assignment Description <span className="text-gray-400">(optional)</span></label>
              <textarea
                id="assignment-description"
                className="border rounded px-2 py-1 min-h-[48px] resize-y"
                value={form.comment}
                onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
                placeholder="Assignment Description (optional)"
                rows={2}
                style={{ minHeight: '48px' }}
              />
            </div>
            {error && <div className="text-red-600 mt-2">{error}</div>}
          </form>
        </>
      )}
    </div>
  )
} 