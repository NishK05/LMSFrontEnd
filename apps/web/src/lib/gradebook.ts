// Gradebook calculation utility
// sections: [{ id, weight }]
// assignments: [{ id, sectionId, dueDate }]
// grades: [{ assignmentId, score, submittedAt }]
// latePenalty: number (e.g., 10 for 10%)
// options: { onlyGraded?: boolean }

export function calculateFinalGrade({
  sections,
  assignments,
  grades,
  latePenalty = 0,
  options = {},
  rounding = 2,
  letterSplits = []
}: {
  sections: { id: string; weight: number }[]
  assignments: { id: string; sectionId: string; dueDate: string }[]
  grades: { assignmentId: string; score: number; submittedAt?: string | null; status?: string }[]
  latePenalty?: number
  options?: { onlyGraded?: boolean }
  rounding?: number
  letterSplits?: { label: string; minPercent: number }[]
}) {
  // Map assignments by section
  const assignmentsBySection: Record<string, { id: string; dueDate: string }[]> = {}
  assignments.forEach(a => {
    if (!assignmentsBySection[a.sectionId]) assignmentsBySection[a.sectionId] = []
    assignmentsBySection[a.sectionId].push({ id: a.id, dueDate: a.dueDate })
  })

  // Map grades by assignmentId
  const gradesByAssignment: Record<string, any> = {}
  grades.forEach(g => {
    gradesByAssignment[g.assignmentId] = g
  })

  let total = 0
  let totalWeight = 0
  const breakdown: Record<string, { sectionId: string; percent: number; mean: number | null }> = {}

  for (const section of sections) {
    const sectionAssignments = assignmentsBySection[section.id] || []
    if (sectionAssignments.length === 0) continue // skip ungraded sections
    let sum = 0
    let count = 0
    for (const a of sectionAssignments) {
      const grade = gradesByAssignment[a.id]
      if (!grade) {
        if (options.onlyGraded) continue
        else {
          sum += 0
          count++
          continue
        }
      }
      let score = grade.score
      // Apply late penalty if status is LATE, or if submittedAt is after dueDate (legacy)
      if ((grade as any).status === 'LATE' || (grade.submittedAt && a.dueDate && new Date(grade.submittedAt) > new Date(a.dueDate))) {
        score = Math.max(0, score * (1 - latePenalty / 100))
      }
      sum += score
      count++
    }
    if (count === 0) continue // skip if no grades at all
    const mean = sum / count
    breakdown[section.id] = { sectionId: section.id, percent: section.weight, mean }
    total += mean * (section.weight / 100)
    totalWeight += section.weight
  }
  // Normalize if totalWeight < 100 (e.g., if some sections are skipped)
  let final = totalWeight > 0 ? (total / (totalWeight / 100)) : 0
  // Apply rounding
  final = Number(final.toFixed(rounding))
  // Determine letter grade if splits provided
  let letter: string | null = null
  if (letterSplits && letterSplits.length > 0) {
    // Sort splits descending by minPercent
    const sorted = [...letterSplits].sort((a, b) => b.minPercent - a.minPercent)
    const found = sorted.find(s => final >= s.minPercent)
    letter = found ? found.label : 'N/A'
  }
  return { final, letter, breakdown }
} 