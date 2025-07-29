"use client"
import { useEffect, useState, useRef } from 'react'
import { GradebookCourse, Assignment, Grade, GradeStatus } from '../types'
import { getAssignments, getGrades, getStudents, saveGradesBulk, getLetterGrades, getRounding } from '../api'
import { useGradebookContext } from '../GradebookContext'
import { calculateFinalGrade } from '@/lib/gradebook'
import AssignmentViewerModal from '@/components/assignments/AssignmentViewerModal'

interface Submission {
  id: string
  assignmentId: string
  studentId: string
  order: number
  status: string
  createdAt: string
  file: {
    id: string
    filename: string
  }
}

export function StudentGrades({ course }: { course: GradebookCourse }) {
  const { assignments, sections } = useGradebookContext()
  const [students, setStudents] = useState<{ id: string; name: string }[]>([])
  const [grades, setGrades] = useState<Grade[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [selectedStudent, setSelectedStudent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [inputMode, setInputMode] = useState<'raw' | 'percent'>('raw')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [publishSuccess, setPublishSuccess] = useState(false)
  const prevGradesRef = useRef<Grade[]>([])
  const [letterSplits, setLetterSplits] = useState<{ label: string; minPercent: number }[]>([])
  const [rounding, setRounding] = useState<number>(2)
  const [showAssignmentModal, setShowAssignmentModal] = useState<{ assignmentId: string, assignmentName: string } | null>(null)

  const refreshGrades = async () => {
    try {
      const gradesData = await getGrades(course.id)
      setGrades(gradesData)
      prevGradesRef.current = JSON.parse(JSON.stringify(gradesData))
      // Also refresh submissions
      if (selectedStudent) {
        await fetchSubmissions(selectedStudent)
      }
    } catch (err) {
      setError('Failed to refresh grades')
    }
  }

  // Fetch submissions for the selected student
  const fetchSubmissions = async (studentId: string) => {
    try {
      const submissionsPromises = assignments.map(async (assignment) => {
        const response = await fetch(`/api/assignments/${assignment.id}/submissions/${studentId}`)
        const data = await response.json()
        return data.data || []
      })
      const submissionsArrays = await Promise.all(submissionsPromises)
      const allSubmissions = submissionsArrays.flat()
      setSubmissions(allSubmissions)
    } catch (err) {
      console.error('Failed to fetch submissions:', err)
      setSubmissions([])
    }
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getStudents(course.id),
      getAssignments(course.id),
      getGrades(course.id),
      getLetterGrades(course.id),
      getRounding(course.id)
    ])
      .then(([studentsData, assignmentsData, gradesData, letterSplitsData, roundingData]) => {
        setStudents(studentsData)
        setGrades(gradesData)
        setLetterSplits(letterSplitsData)
        setRounding(roundingData)
        if (studentsData.length > 0) setSelectedStudent(studentsData[0].id)
      })
      .catch(() => setError('Failed to fetch students or grades'))
      .finally(() => setLoading(false))
  }, [course.id])

  // Fetch submissions when selected student changes
  useEffect(() => {
    if (selectedStudent && assignments.length > 0) {
      fetchSubmissions(selectedStudent)
    }
  }, [selectedStudent, assignments])

  const handleGradeChange = (assignmentId: string, value: number | '') => {
    setGrades(gs => {
      const idx = gs.findIndex(g => g.assignmentId === assignmentId && g.studentId === selectedStudent)
      const assignment = assignments.find(a => a.id === assignmentId)
      if (!assignment) return gs
      if (value === '' || value === null || isNaN(Number(value))) {
        // Remove grade if blank
        if (idx !== -1) {
          return gs.filter((g, i) => i !== idx)
        }
        return gs
      }
      let newScore = value
      if (inputMode === 'percent') {
        newScore = Math.round((Number(value) / 100) * assignment.maxScore)
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
          isPublished: false,
          createdAt: '',
          updatedAt: '',
        }
        return [...gs, newGrade]
      } else {
        return gs.map((g, i) => i === idx ? { ...g, score: newScore } : g)
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
      return gs.map((g, i) => i === idx ? { ...g, comment: value } : g)
    })
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
  const { final, letter, breakdown } = calculateFinalGrade({
    sections,
    assignments,
    grades: studentGrades,
    latePenalty,
    options: { onlyGraded: true },
    rounding,
    letterSplits
  })

  const handleSaveGrades = async () => {
    setSaving(true)
    setSaveSuccess(false)
    setPublishSuccess(false)
    try {
      const studentGradesToSave = grades.filter(g => g.studentId === selectedStudent)
      await saveGradesBulk(course.id, studentGradesToSave)
      setSaveSuccess(true)
      prevGradesRef.current = JSON.parse(JSON.stringify(grades))
    } catch (e) {
      setError('Failed to save grades')
    }
    setSaving(false)
  }

  const handlePublishGrades = async () => {
    setSaving(true)
    setSaveSuccess(false)
    setPublishSuccess(false)
    try {
      const studentGradesToPublish = grades.filter(g => g.studentId === selectedStudent).map(g => ({ ...g, publish: true }))
      await saveGradesBulk(course.id, studentGradesToPublish)
      setPublishSuccess(true)
      prevGradesRef.current = JSON.parse(JSON.stringify(grades))
    } catch (e) {
      setError('Failed to publish grades')
    }
    setSaving(false)
  }

  // Detect unsaved changes and unpublished grades
  const hasUnsavedChanges = JSON.stringify(prevGradesRef.current.filter(g => g.studentId === selectedStudent)) !== JSON.stringify(grades.filter(g => g.studentId === selectedStudent))
  
  // Check if there are any grades that are saved but not published
  const hasUnpublishedGrades = grades.filter(g => g.studentId === selectedStudent).some(g => !g.isPublished)

  // Publish button should be active if there are unpublished grades OR unsaved changes
  const canPublish = hasUnpublishedGrades || hasUnsavedChanges

  useEffect(() => {
    // On load, set prevGradesRef to loaded grades
    prevGradesRef.current = JSON.parse(JSON.stringify(grades))
  }, [selectedStudent, loading])

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
      {/* Save and Publish buttons */}
      <div className="mb-4 flex items-center gap-4">
        <button
          className={`bg-purple-600 text-white px-4 py-2 rounded disabled:opacity-50`}
          onClick={handleSaveGrades}
          disabled={saving || !hasUnsavedChanges}
        >
          {saving ? 'Saving...' : 'Save Grades'}
        </button>
        <button
          className={`bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50`}
          onClick={handlePublishGrades}
          disabled={saving || !canPublish}
        >
          {saving ? 'Publishing...' : 'Publish Grades'}
        </button>
        {saveSuccess && <span className="text-green-600 font-semibold">Grades saved!</span>}
        {publishSuccess && <span className="text-green-600 font-semibold">Grades published!</span>}
      </div>
      {/* Display final grade and breakdown */}
      <div className="mb-4">
        <span className="font-bold text-purple-700 text-xl">
          Final Grade: {final}%
          {letterSplits.length > 0 && (
            <span className="ml-2">({letter})</span>
          )}
        </span>
        <div className="mt-2 text-sm">
          {Object.values(breakdown).length > 0 && (
            <div>
              <span className="font-semibold">Section Breakdown:</span>
              <ul className="ml-4 list-disc">
                {Object.values(breakdown).map(b => {
                  const sectionAssignments = assignments.filter(a => a.sectionId === b.sectionId)
                  const totalPoints = sectionAssignments.reduce((sum, a) => sum + a.maxScore, 0)
                  // mean is average score per assignment, so multiply by count to get total points awarded
                  const pointsAwarded = (b.mean !== null && sectionAssignments.length > 0) ? (b.mean * sectionAssignments.length) : 0
                  return (
                    <li key={b.sectionId}>
                      {sections.find(s => s.id === b.sectionId)?.name || 'Section'}: {b.mean !== null ? `${pointsAwarded.toFixed(2)} / ${totalPoints} (${b.percent}%)` : '-'}
                    </li>
                  )
                })}
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
                  const submission: Submission | undefined = submissions.find(s => s.assignmentId === a.id && s.studentId === selectedStudent)
                  const hasSubmission = submission !== undefined
                  const isSubmitted = hasSubmission || (grade && grade.submittedAt)
                  const isLate = submission && submission.status === 'LATE'

                  return (
                    <tr key={a.id}>
                      <td className="border px-2 py-1">
                        <button
                          className="text-blue-700 underline hover:text-blue-900 font-medium"
                          onClick={() => setShowAssignmentModal({ assignmentId: a.id, assignmentName: a.name })}
                          type="button"
                        >
                          {a.name}
                        </button>
                      </td>
                      <td className="border px-2 py-1">
                        <input
                          type="number"
                          min={0}
                          max={inputMode === 'percent' ? 100 : a.maxScore}
                          value={grade ? getGradeValue(a, grade) : ''}
                          onChange={e => handleGradeChange(a.id, e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-16 border rounded px-1"
                          placeholder={inputMode === 'percent' ? '%' : `0 / ${a.maxScore}`}
                        />
                        <span className="ml-1 text-xs text-gray-500">
                          {inputMode === 'percent' ? '%' : `/ ${a.maxScore}`}
                        </span>
                      </td>
                      <td className="border px-2 py-1">
                        {isSubmitted ? (
                          <span className="text-green-600 font-semibold">Submitted</span>
                        ) : (
                          <span className="text-red-500 font-semibold">Not Submitted</span>
                        )}
                        {isLate && (
                          <span className="ml-2 text-xs text-red-500"> (Late)</span>
                        )}
                      </td>
                    <td className="border px-2 py-1">
                      <select
                        value={submission ? submission.status : (grade ? grade.status : 'ON_TIME')}
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
          {/* AssignmentViewerModal for selected assignment/student */}
          {showAssignmentModal && (
            <AssignmentViewerModal
              assignmentId={showAssignmentModal.assignmentId}
              assignmentName={showAssignmentModal.assignmentName}
              studentId={selectedStudent}
              studentName={students.find(s => s.id === selectedStudent)?.name || ''}
              courseId={course.id}
              open={!!showAssignmentModal}
              onClose={() => setShowAssignmentModal(null)}
              isTeacher={true}
              onGradeSaved={refreshGrades}
            />
          )}
        </>
      )}
    </div>
  )
} 