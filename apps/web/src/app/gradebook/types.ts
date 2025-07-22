export type AssignmentType = 'STANDARD' | 'EXTRA_CREDIT'
export type GradeStatus = 'ON_TIME' | 'LATE'

export interface GradebookCourse {
  id: string
  title: string
  description: string
  instructorId: string
  isPublished: boolean
  isFree: boolean
  price?: number | null
  latePenalty?: number | null
}

export interface GradeSection {
  id: string
  courseId: string
  name: string
  weight: number
  order: number
  createdAt: string
  updatedAt: string
}

export interface Assignment {
  id: string
  courseId: string
  sectionId: string
  name: string
  description?: string | null
  dueDate: string
  type: AssignmentType
  maxScore: number
  createdAt: string
  updatedAt: string
}

export interface Grade {
  id: string
  assignmentId: string
  studentId: string
  score: number
  submittedAt?: string | null
  status: GradeStatus
  comment?: string | null
  createdAt: string
  updatedAt: string
} 