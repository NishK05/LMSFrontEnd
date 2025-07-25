import React from 'react'

interface AssignmentFormProps {
  form: any
  setForm: React.Dispatch<React.SetStateAction<any>>
  sections: any[]
  editing: boolean
  onSave: () => void
  onCancel: () => void
  error: string
  loading: boolean
}

export default function AssignmentForm({ form, setForm, sections, editing, onSave, onCancel, error, loading }: AssignmentFormProps) {
  return (
    <form className="space-y-2 mb-4" onSubmit={e => { e.preventDefault(); onSave() }}>
      <div className="flex gap-2 items-center">
        <input
          className="border rounded px-2 py-1"
          value={form.name}
          onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))}
          placeholder="Assignment name"
        />
        <input
          type="date"
          className="border rounded px-2 py-1"
          value={form.dueDate}
          onChange={e => setForm((f: any) => ({ ...f, dueDate: e.target.value }))}
        />
        <input
          type="time"
          className="border rounded px-2 py-1"
          value={form.dueTime}
          onChange={e => setForm((f: any) => ({ ...f, dueTime: e.target.value }))}
          placeholder="Due time (optional)"
        />
        <select
          className="border rounded px-2 py-1"
          value={form.sectionId}
          onChange={e => setForm((f: any) => ({ ...f, sectionId: e.target.value }))}
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
          onChange={e => setForm((f: any) => ({ ...f, points: Number(e.target.value) }))}
          placeholder="Points"
        />
        <button className="bg-purple-700 text-white px-3 py-1 rounded" type="submit" disabled={loading}>
          {editing ? 'Update' : 'Add'}
        </button>
        {editing && (
          <button className="ml-2 text-gray-500" type="button" onClick={onCancel} disabled={loading}>Cancel</button>
        )}
      </div>
      {/* Assignment Description textarea below */}
      <div className="flex flex-col gap-1">
        <label htmlFor="assignment-description" className="font-medium text-sm">Assignment Description <span className="text-gray-400">(optional)</span></label>
        <textarea
          id="assignment-description"
          className="border rounded px-2 py-1 min-h-[48px] resize-y"
          value={form.comment}
          onChange={e => setForm((f: any) => ({ ...f, comment: e.target.value }))}
          placeholder="Assignment Description (optional)"
          rows={2}
          style={{ minHeight: '48px' }}
        />
      </div>
      {error && <div className="text-red-600 mt-2">{error}</div>}
    </form>
  )
} 