import { GradebookCourse, GradeSection, Assignment, Grade } from './types'

export async function getUserCourses(userId: string): Promise<GradebookCourse[]> {
  const res = await fetch(`/api/gradebook/courses?userId=${userId}`)
  const data = await res.json()
  if (data.success && data.data) return data.data
  return []
}

// Keep the rest of the API stubs for now
export async function getSections(courseId: string): Promise<GradeSection[]> {
  return [
    { id: 'section1', courseId, name: 'Homework', weight: 40, order: 1, createdAt: '', updatedAt: '' }
  ]
}

export async function getAssignments(courseId: string): Promise<Assignment[]> {
  return [
    { id: 'assignment1', courseId, sectionId: 'section1', name: 'Quiz 1', description: 'A quiz', dueDate: '', type: 'STANDARD', maxScore: 100, createdAt: '', updatedAt: '' }
  ]
}

export async function getGrades(courseId: string): Promise<Grade[]> {
  return [
    { id: 'grade1', assignmentId: 'assignment1', studentId: 'student1', score: 95, submittedAt: '', status: 'ON_TIME', comment: '', createdAt: '', updatedAt: '' }
  ]
}

export async function getLatePenalty(courseId: string): Promise<number> {
  return 10
}

export async function getStudents(courseId: string): Promise<{ id: string; name: string }[]> {
  return [
    { id: 'student1', name: 'Alice' },
    { id: 'student2', name: 'Bob' }
  ]
} 