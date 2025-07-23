"use client"
import { useEffect, useState } from 'react'
import { GradebookCourse, Assignment, Grade, GradeStatus } from '../types'
import { getAssignments, getGrades, getStudents, saveGrade } from '../api'
import { useGradebookContext } from '../GradebookContext'
import { calculateFinalGrade } from '@/lib/gradebook'

export function StudentGrades({ course }: { course: GradebookCourse }) {
  const { assignments, sections } = useGradebookContext()
  const [students, setStudents] = useState<{ id: string; name: string }[]>([])
  const [grades, setGrades] = useState<Grade[]>([])
  const [selectedStudent, setSelectedStudent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [inputMode, setInputMode] = useState<'raw' | 'percent'>('raw')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getStudents(course.id),
      getAssignments(course.id),
      getGrades(course.id)
    ])
      .then(([studentsData, assignmentsData, gradesData]) => {
        setStudents(studentsData)
        setGrades(gradesData)
        if (studentsData.length > 0) setSelectedStudent(studentsData[0].id)
      })
      .catch(() => setError('Failed to fetch students or grades'))
      .finally(() => setLoading(false))
  }, [course.id])

  const handleGradeChange = async (assignmentId: string, value: number) => {
    setGrades(gs => {
      const idx = gs.findIndex(g => g.assignmentId === assignmentId && g.studentId === selectedStudent)
      const assignment = assignments.find(a => a.id === assignmentId)
      if (!assignment) return gs
      let newScore = value
      if (inputMode === 'percent') {
        newScore = Math.round((value / 100) * assignment.maxScore)
      }
      if (idx === -1) {
        // Create new grade
        const newGrade = {
          id: '',
          assignmentId,
          studentId: selectedStudent,
          score: newScore,
          submittedAt: '',
          status: 'ON_TIME' as GradeStatus,
          comment: '',
          createdAt: '',
          updatedAt: '',
        }
        saveGrade(course.id, newGrade).then(saved => {
          setGrades(current => current.map(g => g === newGrade ? saved : g))
        })
        return [...gs, newGrade]
      } else {
        const updated = gs.map((g, i) => i === idx ? { ...g, score: newScore } : g)
        saveGrade(course.id, updated[idx]).then(saved => {
          setGrades(current => current.map(g => g.assignmentId === saved.assignmentId && g.studentId === saved.studentId ? saved : g))
        })
        return updated
      }
    })
  }

  const getGradeValue = (assignment: Assignment, grade: Grade) => {
    if (inputMode === 'percent') {
      return assignment.maxScore ? Math.round((grade.score / assignment.maxScore) * 100) : 0
    } else {
      return grade.score
    }
  }

  const handleCommentChange = (assignmentId: string, value: string) => {
    setGrades(gs => {
      const idx = gs.findIndex(g => g.assignmentId === assignmentId && g.studentId === selectedStudent)
      if (idx === -1) return gs
      const updated = gs.map((g, i) => i === idx ? { ...g, comment: value } : g)
      return updated
    })
  }

  const handleCommentBlur = (assignmentId: string) => {
    const grade = grades.find(g => g.assignmentId === assignmentId && g.studentId === selectedStudent)
    if (grade) {
      saveGrade(course.id, grade).then(saved => {
        setGrades(current => current.map(g => g.assignmentId === saved.assignmentId && g.studentId === saved.studentId ? saved : g))
      })
    }
  }

  const handleStatusChange = (assignmentId: string, value: string) => {
    setGrades(gs => gs.map(g => g.assignmentId === assignmentId && g.studentId === selectedStudent ? { ...g, status: value as GradeStatus } : g))
  }

  // Calculate average for each assignment
  const getAssignmentAverage = (assignmentId: string) => {
    const scores = grades.filter(g => g.assignmentId === assignmentId).map(g => g.score)
    if (scores.length === 0) return '-'
    return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
  }

  // Use only real assignments from context
  const realAssignments = assignments

  // Compute final grade and breakdown for selected student
  const studentGrades = grades.filter(g => g.studentId === selectedStudent)
  const latePenalty = course.latePenalty ?? 0
  const { final, breakdown } = calculateFinalGrade({
    sections,
    assignments,
    grades: studentGrades,
    latePenalty,
    options: { onlyGraded: false }
  })

  return (
    <div>
      <h3 className="font-bold text-lg mb-2">Student Grades</h3>
      <div className="mb-4 flex items-center gap-4">
        <div>
          <label className="mr-2 font-semibold">Student:</label>
          <select
            className="border rounded px-2 py-1"
            value={selectedStudent}
            onChange={e => setSelectedStudent(e.target.value)}
          >
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <span className="mr-2 font-semibold">Grade Input:</span>
          <button
            className={`px-2 py-1 rounded-l ${inputMode === 'raw' ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700'}`}
            onClick={() => setInputMode('raw')}
          >Raw</button>
          <button
            className={`px-2 py-1 rounded-r ${inputMode === 'percent' ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700'}`}
            onClick={() => setInputMode('percent')}
          >Percent</button>
        </div>
      </div>
      {/* Display final grade and breakdown */}
      <div className="mb-4">
        <span className="font-bold text-purple-700 text-xl">Final Grade: {final} / 100</span>
        <div className="mt-2 text-sm">
          {Object.values(breakdown).length > 0 && (
            <div>
              <span className="font-semibold">Section Breakdown:</span>
              <ul className="ml-4 list-disc">
                {Object.values(breakdown).map(b => (
                  <li key={b.sectionId}>
                    {sections.find(s => s.id === b.sectionId)?.name || 'Section'}: {b.mean !== null ? b.mean.toFixed(1) : '-'} ({b.percent}%)
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      {loading ? (
        <div className="text-purple-400">Loading...</div>
      ) : (
        <>
          <table className="min-w-full border text-sm">
            <thead>
              <tr className="bg-purple-100">
                <th className="px-2 py-1 border">Assignment</th>
                <th className="px-2 py-1 border">Score</th>
                <th className="px-2 py-1 border">Submitted</th>
                <th className="px-2 py-1 border">Status</th>
                <th className="px-2 py-1 border">Feedback <span className='text-gray-400'>(optional)</span></th>
                <th className="px-2 py-1 border">Avg</th>
              </tr>
            </thead>
            <tbody>
              {realAssignments.map(a => {
                const grade: Grade | undefined = grades.find(g => g.assignmentId === a.id && g.studentId === selectedStudent)
                return (
                  <tr key={a.id}>
                    <td className="border px-2 py-1">{a.name}</td>
                    <td className="border px-2 py-1">
                      <input
                        type="number"
                        min={0}
                        max={inputMode === 'percent' ? 100 : a.maxScore}
                        value={grade ? getGradeValue(a, grade) : ''}
                        onChange={e => handleGradeChange(a.id, Number(e.target.value))}
                        className="w-16 border rounded px-1"
                        placeholder={inputMode === 'percent' ? '%' : `0 / ${a.maxScore}`}
                      />
                      <span className="ml-1 text-xs text-gray-500">
                        {inputMode === 'percent' ? '%' : `/ ${a.maxScore}`}
                      </span>
                    </td>
                    <td className="border px-2 py-1">
                      {grade && grade.submittedAt ? (
                        <input
                          type="date"
                          value={grade.submittedAt.split('T')[0]}
                          onChange={e => setGrades(gs => gs.map(g => g.assignmentId === a.id && g.studentId === selectedStudent ? { ...g, submittedAt: e.target.value } : g))}
                          className="w-28 border rounded px-1"
                        />
                      ) : (
                        <span className="text-xs text-red-500">Not Submitted</span>
                      )}
                    </td>
                    <td className="border px-2 py-1">
                      <select
                        value={grade ? grade.status : 'ON_TIME'}
                        onChange={e => handleStatusChange(a.id, e.target.value)}
                        className="border rounded px-1"
                      >
                        <option value="ON_TIME">On Time</option>
                        <option value="LATE">Late</option>
                      </select>
                    </td>
                    <td className="border px-2 py-1">
                      <input
                        value={grade ? grade.comment || '' : ''}
                        onChange={e => handleCommentChange(a.id, e.target.value)}
                        onBlur={() => handleCommentBlur(a.id)}
                        className="border rounded px-1"
                        placeholder="Feedback (optional)"
                      />
                    </td>
                    <td className="border px-2 py-1 text-center text-purple-700 font-semibold">{getAssignmentAverage(a.id)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
} 