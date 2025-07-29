import { GradebookCourse, GradeSection, Assignment, Grade, LetterGradeSplit } from './types'

export async function getUserCourses(userId: string): Promise<GradebookCourse[]> {
  const res = await fetch(`/api/gradebook/courses?userId=${userId}`)
  const data = await res.json()
  if (data.success && data.data) return data.data
  return []
}

export async function getSections(courseId: string): Promise<GradeSection[]> {
  const res = await fetch(`/api/gradebook/${courseId}/sections`)
  const data = await res.json()
  if (data.success && data.data) return data.data
  return []
}

export async function saveSections(courseId: string, sections: GradeSection[]) {
  const res = await fetch(`/api/gradebook/${courseId}/sections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sections }),
  })
  const data = await res.json()
  if (!data.success) throw new Error(data.error || 'Failed to save')
  return data.data
}

export async function getAssignments(courseId: string): Promise<Assignment[]> {
  const res = await fetch(`/api/gradebook/${courseId}/assignments`)
  const data = await res.json()
  if (data.success && data.data) return data.data
  return []
}

export async function saveAssignment(courseId: string, assignment: Partial<Assignment>) {
  const method = assignment.id ? 'PUT' : 'POST'
  const url = assignment.id
    ? `/api/gradebook/${courseId}/assignments/${assignment.id}`
    : `/api/gradebook/${courseId}/assignments`
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(assignment),
  })
  const data = await res.json()
  if (!data.success) throw new Error(data.error || 'Failed to save assignment')
  return data.data
}

export async function deleteAssignment(courseId: string, assignmentId: string) {
  const res = await fetch(`/api/gradebook/${courseId}/assignments/${assignmentId}`, {
    method: 'DELETE',
  })
  const data = await res.json()
  if (!data.success) throw new Error(data.error || 'Failed to delete assignment')
  return data
}

export async function getGrades(courseId: string, role?: string): Promise<Grade[]> {
  let url = `/api/gradebook/${courseId}/grades`
  if (role) {
    url += `?role=${role}`
    // For students, we need to also pass the user ID
    if (role === 'STUDENT') {
      // Get the current user ID from the session or localStorage
      // For now, we'll let the backend handle this, but in a real app you'd get the user ID
      // url += `&userId=${userId}`
    }
  }
  const res = await fetch(url)
  const data = await res.json()
  if (data.success && data.data) return data.data
  return []
}

export async function saveGrade(courseId: string, grade: Partial<Grade>) {
  const res = await fetch(`/api/gradebook/${courseId}/grades`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(grade),
  })
  const data = await res.json()
  if (!data.success) throw new Error(data.error || 'Failed to save grade')
  return data.data
}

export async function saveGradesBulk(courseId: string, grades: any[]) {
  const res = await fetch(`/api/gradebook/${courseId}/grades/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grades }),
  })
  const data = await res.json()
  if (!data.success) throw new Error(data.error || 'Failed to save grades')
  return data.data
}

export async function getLatePenalty(courseId: string): Promise<number> {
  const res = await fetch(`/api/gradebook/${courseId}/late-penalty`)
  const data = await res.json()
  if (data.success && data.data) return data.data.latePenalty
  return 0
}

export async function saveLatePenalty(courseId: string, latePenalty: number) {
  const res = await fetch(`/api/gradebook/${courseId}/late-penalty`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ latePenalty }),
  })
  const data = await res.json()
  if (!data.success) throw new Error(data.error || 'Failed to save late penalty')
  return data.data
}

export async function getStudents(courseId: string): Promise<{ id: string; name: string }[]> {
  const res = await fetch(`/api/gradebook/${courseId}/students`)
  const data = await res.json()
  if (data.success && data.data) return data.data
  return []
}

export async function getLetterGrades(courseId: string): Promise<LetterGradeSplit[]> {
  const res = await fetch(`/api/gradebook/${courseId}/letter-grades`)
  const data = await res.json()
  if (data.success && data.data) return data.data
  return []
}

export async function saveLetterGrades(courseId: string, splits: LetterGradeSplit[]) {
  const res = await fetch(`/api/gradebook/${courseId}/letter-grades`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ splits }),
  })
  const data = await res.json()
  if (!data.success) throw new Error(data.error || 'Failed to save letter grades')
  return data.data
}

export async function getRounding(courseId: string): Promise<number> {
  const res = await fetch(`/api/gradebook/${courseId}/rounding`)
  const data = await res.json()
  if (data.success && data.data) return data.data.rounding
  return 2
}

export async function saveRounding(courseId: string, rounding: number) {
  const res = await fetch(`/api/gradebook/${courseId}/rounding`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rounding }),
  })
  const data = await res.json()
  if (!data.success) throw new Error(data.error || 'Failed to save rounding')
  return data.data
}