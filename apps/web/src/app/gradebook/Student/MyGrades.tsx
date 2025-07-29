"use client"
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GradebookCourse, Assignment, GradeSection, Grade, GradeStatus } from '../types'
import { getAssignments, getGrades, getSections, getLatePenalty, getLetterGrades, getRounding } from '../api'
import { calculateFinalGrade } from '@/lib/gradebook'

export function MyGrades({ course }: { course: GradebookCourse }) {
  const router = useRouter()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [sections, setSections] = useState<GradeSection[]>([])
  const [grades, setGrades] = useState<Grade[]>([])
  const [latePenalty, setLatePenalty] = useState<number>(0)
  const [letterSplits, setLetterSplits] = useState<{ label: string; minPercent: number }[]>([])
  const [rounding, setRounding] = useState<number>(2)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [whatIfMode, setWhatIfMode] = useState(false)
  const [whatIfAssignments, setWhatIfAssignments] = useState<Assignment[]>([])
  const [whatIfSections, setWhatIfSections] = useState<GradeSection[]>([])
  const [whatIfGrades, setWhatIfGrades] = useState<Grade[]>([])
  const [whatIfLatePenalty, setWhatIfLatePenalty] = useState<number>(0)
  const [whatIfActive, setWhatIfActive] = useState(false)
  const [inputMode, setInputMode] = useState<'raw' | 'percent'>('raw')

  const handleAssignmentClick = (assignmentId: string) => {
    router.push(`/courses/${course.id}/assignments/${assignmentId}`)
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getAssignments(course.id),
      getSections(course.id),
      getGrades(course.id, 'STUDENT'),
      getLatePenalty(course.id),
      getLetterGrades(course.id),
      getRounding(course.id)
    ])
      .then(([assignmentsData, sectionsData, gradesData, latePenaltyData, letterSplitsData, roundingData]) => {
        setAssignments(assignmentsData)
        setSections(sectionsData)
        setGrades(gradesData)
        setLatePenalty(latePenaltyData)
        setLetterSplits(letterSplitsData)
        setRounding(roundingData)
        // Reset what-if state on reload
        setWhatIfMode(false)
        setWhatIfActive(false)
      })
      .catch(() => setError('Failed to fetch grades'))
      .finally(() => setLoading(false))
  }, [course.id])

  // What-If: Activate mode and clone data
  const activateWhatIf = () => {
    setWhatIfAssignments(assignments.map(a => ({ ...a })))
    setWhatIfSections(sections.map(s => ({ ...s })))
    setWhatIfGrades(grades.map(g => ({ ...g })))
    setWhatIfLatePenalty(latePenalty)
    setWhatIfMode(true)
    setWhatIfActive(true)
  }
  // What-If: Revert to original
  const revertWhatIf = () => {
    setWhatIfMode(false)
    setWhatIfActive(false)
  }

  // Use what-if or real data
  const displayAssignments = whatIfMode ? whatIfAssignments : assignments
  const displaySections = whatIfMode ? whatIfSections : sections
  const displayGrades = whatIfMode ? whatIfGrades : grades
  const displayLatePenalty = whatIfMode ? whatIfLatePenalty : latePenalty

  // For now, assume the logged-in student is the only one in the grades array
  // (in a real app, filter by session user ID)
  const studentId = displayGrades.length > 0 ? displayGrades[0].studentId : ''
  const studentGrades = displayGrades.filter(g => g.studentId === studentId)

  const { final, letter, breakdown } = calculateFinalGrade({
    sections: displaySections,
    assignments: displayAssignments,
    grades: studentGrades,
    latePenalty: displayLatePenalty,
    options: { onlyGraded: true },
    rounding,
    letterSplits
  })

  // What-If: Handlers for editing
  const handleWhatIfGradeChange = (assignmentId: string, value: number | '') => {
    setWhatIfGrades(gs => {
      const idx = gs.findIndex(g => g.assignmentId === assignmentId && g.studentId === studentId)
      const assignment = displayAssignments.find(a => a.id === assignmentId)
      if (!assignment) return gs
      if (value === '' || value === null || isNaN(Number(value))) {
        if (idx !== -1) return gs.filter((g, i) => i !== idx)
        return gs
      }
      let newScore = value
      if (inputMode === 'percent') {
        newScore = Math.round((Number(value) / 100) * assignment.maxScore)
      }
      if (idx === -1) {
        return [...gs, {
          id: `whatif-${assignmentId}`,
          assignmentId,
          studentId,
          score: Number(newScore),
          submittedAt: '',
          status: 'ON_TIME' as GradeStatus,
          comment: '',
          isPublished: true,
          createdAt: '',
          updatedAt: '',
        }]
      } else {
        return gs.map((g, i) => i === idx ? { ...g, score: Number(newScore) } : g)
      }
    })
  }
  const getWhatIfGradeValue = (assignment: Assignment, grade: Grade) => {
    if (inputMode === 'percent') {
      return assignment.maxScore ? Math.round((grade.score / assignment.maxScore) * 100) : 0
    } else {
      return grade.score
    }
  }
  const handleWhatIfStatusChange = (assignmentId: string, value: string) => {
    setWhatIfGrades(gs => gs.map(g => g.assignmentId === assignmentId && g.studentId === studentId ? { ...g, status: value as GradeStatus } : g))
  }
  const handleWhatIfSectionWeightChange = (sectionId: string, weight: number) => {
    setWhatIfSections(ss => ss.map(s => s.id === sectionId ? { ...s, weight } : s))
  }
  const handleWhatIfLatePenaltyChange = (value: number) => {
    setWhatIfLatePenalty(value)
  }
  // What-If: Add new assignment
  const handleAddWhatIfAssignment = () => {
    const newId = `whatif-${Date.now()}`
    setWhatIfAssignments(as => [...as, {
      id: newId,
      courseId: course.id,
      sectionId: displaySections[0]?.id || '',
      name: 'What-If Assignment',
      description: '',
      dueDate: new Date().toISOString(),
      type: 'STANDARD',
      maxScore: 100,
      createdAt: '',
      updatedAt: '',
    }])
  }
  const handleWhatIfAssignmentNameChange = (assignmentId: string, value: string) => {
    setWhatIfAssignments(as => as.map(a => a.id === assignmentId ? { ...a, name: value } : a))
  }
  const handleWhatIfAssignmentCategoryChange = (assignmentId: string, sectionId: string) => {
    setWhatIfAssignments(as => as.map(a => a.id === assignmentId ? { ...a, sectionId } : a))
  }

  return (
    <div>
      <h3 className="font-bold text-lg mb-2">My Grades</h3>
      {whatIfActive && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-3 mb-4 flex items-center justify-between">
          <span>What-If Mode Active. Changes are not saved. <b>Revert to Original</b> to exit.</span>
          <button className="ml-4 bg-yellow-500 text-white px-3 py-1 rounded" onClick={revertWhatIf}>Revert to Original</button>
        </div>
      )}
      <div className="mb-4 flex items-center gap-4">
        <span className="mr-2 font-semibold">Grade Input:</span>
        <button
          className={`px-2 py-1 rounded-l ${inputMode === 'raw' ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700'}`}
          onClick={() => setInputMode('raw')}
        >Raw</button>
        <button
          className={`px-2 py-1 rounded-r ${inputMode === 'percent' ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700'}`}
          onClick={() => setInputMode('percent')}
        >Percent</button>
        {!whatIfMode ? (
          <button className="ml-4 bg-purple-700 text-white px-4 py-2 rounded" onClick={activateWhatIf}>Try What-If</button>
        ) : (
          <button className="ml-4 bg-gray-400 text-white px-4 py-2 rounded cursor-not-allowed" disabled>What-If Mode</button>
        )}
        {whatIfMode && (
          <button
            className="ml-4 bg-green-600 text-white px-3 py-1 rounded"
            onClick={handleAddWhatIfAssignment}
          >Add What-If Assignment</button>
        )}
      </div>
      {loading ? (
        <div className="text-purple-400">Loading...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : (
        <>
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
                      const sectionAssignments = displayAssignments.filter(a => a.sectionId === b.sectionId)
                      const totalPoints = sectionAssignments.reduce((sum, a) => sum + a.maxScore, 0)
                      const pointsAwarded = (b.mean !== null && sectionAssignments.length > 0) ? (b.mean * sectionAssignments.length) : 0
                      return (
                        <li key={b.sectionId}>
                          {displaySections.find(s => s.id === b.sectionId)?.name || 'Section'}: {b.mean !== null ? `${pointsAwarded.toFixed(2)} / ${totalPoints} (${b.percent}%)` : '-'}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>
          <table className="min-w-full border text-sm">
            <thead>
              <tr className="bg-purple-100">
                <th className="px-2 py-1 border">Assignment</th>
                <th className="px-2 py-1 border">Category</th>
                <th className="px-2 py-1 border">Score</th>
                <th className="px-2 py-1 border">Submitted</th>
                <th className="px-2 py-1 border">Status</th>
                <th className="px-2 py-1 border">Feedback</th>
              </tr>
            </thead>
            <tbody>
              {displayAssignments.map(a => {
                const grade: Grade | undefined = displayGrades.find(g => g.assignmentId === a.id && g.studentId === studentId)
                const isWhatIf = a.id.startsWith('whatif-')
                return (
                  <tr key={a.id}>
                    <td className="border px-2 py-1">
                      {whatIfMode && isWhatIf ? (
                        <input
                          className="border rounded px-2 py-1 w-32"
                          value={a.name}
                          onChange={e => handleWhatIfAssignmentNameChange(a.id, e.target.value)}
                          placeholder="Assignment name"
                        />
                      ) : (
                        <button
                          onClick={() => handleAssignmentClick(a.id)}
                          className="text-blue-600 hover:text-blue-800 underline font-medium cursor-pointer"
                        >
                          {a.name}
                        </button>
                      )}
                    </td>
                    <td className="border px-2 py-1">
                      {whatIfMode && isWhatIf ? (
                        <select
                          className="border rounded px-2 py-1"
                          value={a.sectionId}
                          onChange={e => handleWhatIfAssignmentCategoryChange(a.id, e.target.value)}
                        >
                          {displaySections.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      ) : (
                        displaySections.find(s => s.id === a.sectionId)?.name || '-'
                      )}
                    </td>
                    <td className="border px-2 py-1">
                      {whatIfMode ? (
                        <input
                          type="number"
                          min={0}
                          max={inputMode === 'percent' ? 100 : a.maxScore}
                          value={grade ? getWhatIfGradeValue(a, grade) : ''}
                          onChange={e => handleWhatIfGradeChange(a.id, e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-16 text-right"
                          placeholder={inputMode === 'percent' ? '%' : `0 / ${a.maxScore}`}
                        />
                      ) : (
                        grade ? (
                          inputMode === 'percent'
                            ? `${a.maxScore ? Math.round((grade.score / a.maxScore) * 100) : 0}%`
                            : `${grade.score} / ${a.maxScore}`
                        ) : '-'
                      )}
                      {whatIfMode && (
                        <span className="ml-1 text-xs text-gray-500">
                          {inputMode === 'percent' ? '%' : `/ ${a.maxScore}`}
                        </span>
                      )}
                    </td>
                    <td className="border px-2 py-1">
                      {whatIfMode ? (
                        <input
                          type="date"
                          value={whatIfGrades.find(g => g.assignmentId === a.id && g.studentId === studentId)?.submittedAt || ''}
                          onChange={(e) => setWhatIfGrades(gs => gs.map(g => g.assignmentId === a.id && g.studentId === studentId ? { ...g, submittedAt: e.target.value } : g))}
                          className="w-24"
                        />
                      ) : (
                        grade && grade.submittedAt ? grade.submittedAt.split('T')[0] : 'Not Submitted'
                      )}
                    </td>
                    <td className="border px-2 py-1">
                      {whatIfMode ? (
                        <select
                          value={whatIfGrades.find(g => g.assignmentId === a.id && g.studentId === studentId)?.status || ''}
                          onChange={(e) => handleWhatIfStatusChange(a.id, e.target.value)}
                          className="w-24"
                        >
                          <option value="ON_TIME">On Time</option>
                          <option value="LATE">Late</option>
                          <option value="EXEMPT">Exempt</option>
                        </select>
                      ) : (
                        grade ? grade.status : '-'
                      )}
                    </td>
                    <td className="border px-2 py-1">
                      {whatIfMode ? (
                        <textarea
                          value={whatIfGrades.find(g => g.assignmentId === a.id && g.studentId === studentId)?.comment || ''}
                          onChange={(e) => setWhatIfGrades(gs => gs.map(g => g.assignmentId === a.id && g.studentId === studentId ? { ...g, comment: e.target.value } : g))}
                          className="w-full"
                        />
                      ) : (
                        grade ? grade.comment || '' : ''
                      )}
                    </td>
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