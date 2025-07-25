"use client"
import { useEffect, useState } from 'react'
import { GradebookCourse, Assignment, GradeSection } from '../types'
import { getAssignments, saveAssignment, deleteAssignment } from '../api'
import { useGradebookContext } from '../GradebookContext'
import AssignmentForm from './AssignmentForm'

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
          {/* Use the new AssignmentForm component for the form UI */}
          <AssignmentForm
            form={form}
            setForm={setForm}
            sections={sections}
            editing={editing}
            onSave={handleSave}
            onCancel={() => { resetForm(); setEditing(false) }}
            error={error}
            loading={loading}
          />
        </>
      )}
    </div>
  )
} 