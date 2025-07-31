'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Button } from '@lms/ui'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { BookOpen, User2, Eye, EyeOff, ChevronUp, Calendar } from 'lucide-react'
import { calculateFinalGrade } from '@/lib/gradebook'

interface Course {
  id: string
  title: string
  description: string
  instructor: {
    name: string
    email: string
  }
  progress: number
  grade?: {
    letter: string
    percentage: number
  }
}

interface Assignment {
  id: string
  title: string
  description: string
  dueDate: string // ISO string
  courseTitle: string
  courseId: string
}

interface Grade {
  id: string
  assignmentId: string
  studentId: string
  score: number
  submittedAt?: string | null
  status: string
  comment?: string | null
  isPublished: boolean
  rubricSelections?: string[] // Array of checked rubric item IDs
  createdAt: string
  updatedAt: string
}

interface GradeSection {
  id: string
  courseId: string
  name: string
  weight: number
  order: number
  createdAt: string
  updatedAt: string
}

interface LetterGradeSplit {
  id: string
  courseId: string
  label: string
  minPercent: number
  order: number
  createdAt: string
  updatedAt: string
}

// Remove mock assignments - we'll fetch from backend
// const mockAssignments: Assignment[] = [...]

function groupAssignmentsByDate(assignments: Assignment[]) {
  // Sort assignments by due date (soonest first)
  const sortedAssignments = [...assignments].sort((a, b) => {
    const dateA = new Date(a.dueDate)
    const dateB = new Date(b.dueDate)
    return dateA.getTime() - dateB.getTime()
  })

  const groups: { [date: string]: Assignment[] } = {}
  
  sortedAssignments.forEach(a => {
    const date = new Date(a.dueDate).toLocaleDateString()
    if (!groups[date]) groups[date] = []
    groups[date].push(a)
  })

  // Sort groups by date (soonest first)
  const sortedGroups = Object.entries(groups).sort(([dateA], [dateB]) => {
    return new Date(dateA).getTime() - new Date(dateB).getTime()
  })

  return Object.fromEntries(sortedGroups)
}

function formatDueTime(dueDate: string): string {
  const date = new Date(dueDate)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function isOverdue(dueDate: string): boolean {
  return new Date(dueDate) < new Date()
}

export default function StudentDashboardPage() {
  const { data: sessionRaw } = useSession()
  const session = sessionRaw as (typeof sessionRaw & { user?: { id?: string; name?: string | null; email?: string | null; image?: string | null; role?: string } })
  const router = useRouter()
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [showGrades, setShowGrades] = useState(true)
  const [gradesLoading, setGradesLoading] = useState(false)
  const [showPreviousAssignments, setShowPreviousAssignments] = useState(false)
  const [maxAssignmentsToShow] = useState(6) // Maximum assignments to show initially

  // Fetch grades for a specific course
  const fetchCourseGrades = async (courseId: string, studentId: string) => {
    try {
      // Fetch grades, sections, assignments, and letter grade splits
      const [gradesRes, sectionsRes, assignmentsRes, letterGradesRes] = await Promise.all([
        fetch(`/api/gradebook/${courseId}/grades?role=STUDENT`),
        fetch(`/api/gradebook/${courseId}/sections`),
        fetch(`/api/gradebook/${courseId}/assignments`),
        fetch(`/api/gradebook/${courseId}/letter-grades`)
      ])

      const [gradesData, sectionsData, assignmentsData, letterGradesData] = await Promise.all([
        gradesRes.json(),
        sectionsRes.json(),
        assignmentsRes.json(),
        letterGradesRes.json()
      ])

      if (gradesData.success && sectionsData.success && assignmentsData.success && letterGradesData.success) {
        const grades: Grade[] = gradesData.data || []
        const sections: GradeSection[] = sectionsData.data || []
        const assignments: any[] = assignmentsData.data || []
        const letterSplits: LetterGradeSplit[] = letterGradesData.data || []

        // Filter grades for this student
        const studentGrades = grades.filter(g => g.studentId === studentId)

        // Calculate final grade
        const result = calculateFinalGrade({
          sections: sections.map(s => ({ id: s.id, weight: s.weight })),
          assignments: assignments.map(a => ({ id: a.id, sectionId: a.sectionId, dueDate: a.dueDate })),
          grades: studentGrades,
          letterSplits: letterSplits.map(s => ({ label: s.label, minPercent: s.minPercent })),
          options: { onlyGraded: true }
        })

        return {
          letter: result.letter || 'N/A',
          percentage: result.final
        }
      }
    } catch (error) {
      console.error('Error fetching grades for course:', courseId, error)
    }
    return null
  }

  useEffect(() => {
    if (session?.user?.role !== 'STUDENT') {
      return
    }
    
    const fetchEnrolledCourses = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/enrollments?userId=${session?.user?.id}`)
        if (response.ok) {
          const data = await response.json()
          setEnrolledCourses(data.data || [])
        }
      } catch (error) {
        console.error('Error fetching enrollments:', error)
      } finally {
        setLoading(false)
      }
    }

    const fetchAssignments = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/assignments?userId=${session?.user?.id}`)
        if (response.ok) {
          const data = await response.json()
          setAssignments(data.data || [])
        }
      } catch (error) {
        console.error('Error fetching assignments:', error)
        // Fallback to empty array if endpoint doesn't exist yet
        setAssignments([])
      }
    }
    
    fetchEnrolledCourses()
    fetchAssignments()
  }, [session, router])

  // Fetch grades for all courses when showGrades changes
  useEffect(() => {
    if (!showGrades || !session?.user?.id || enrolledCourses.length === 0) return

    const fetchAllGrades = async () => {
      setGradesLoading(true)
      try {
        const coursesWithGrades = await Promise.all(
          enrolledCourses.map(async (course) => {
            const grade = await fetchCourseGrades(course.id, session.user.id!)
            return {
              ...course,
              grade: grade || undefined
            }
          })
        )
        setEnrolledCourses(coursesWithGrades)
      } catch (error) {
        console.error('Error fetching grades:', error)
      } finally {
        setGradesLoading(false)
      }
    }

    fetchAllGrades()
  }, [showGrades, session?.user?.id]) // Removed enrolledCourses.length from dependencies

  // Group assignments by due date
  const groupedAssignments = groupAssignmentsByDate(assignments)

  // Get assignments to display based on showPreviousAssignments state
  const getAssignmentsToDisplay = () => {
    const allEntries = Object.entries(groupedAssignments)
    
    if (showPreviousAssignments) {
      // Show previous set of assignments (older ones)
      return allEntries.slice(0, 3) // Show first 3 date groups
    } else {
      // Show current assignments (newest ones)
      return allEntries.slice(-3) // Show last 3 date groups
    }
  }

  const assignmentsToDisplay = getAssignmentsToDisplay()
  const hasMoreAssignments = Object.keys(groupedAssignments).length > 3

  if (session?.user?.role !== 'STUDENT') {
    return null
  }

  return (
    <ProtectedRoute>
      <DashboardLayout
        rightSidebar={
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="text-lg font-semibold text-purple-800">To Do's</div>
              <div className="flex gap-2">
                {hasMoreAssignments && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPreviousAssignments(!showPreviousAssignments)}
                    className="flex items-center gap-1"
                  >
                    <ChevronUp className={`w-3 h-3 transition-transform ${showPreviousAssignments ? 'rotate-180' : ''}`} />
                    {showPreviousAssignments ? 'View Current' : 'View Previous'}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/calendar')}
                  className="flex items-center gap-1"
                >
                  <Calendar className="w-3 h-3" />
                  See More
                </Button>
              </div>
            </div>
            
            {assignmentsToDisplay.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No assignments due</p>
              </div>
            ) : (
              assignmentsToDisplay.map(([date, assignments]) => (
                <div key={date}>
                  <div className="text-xs font-bold text-purple-600 mb-2">
                    Due {date}
                  </div>
                  <div className="space-y-3">
                    {assignments.slice(0, maxAssignmentsToShow).map(assignment => {
                      const isOverdueAssignment = isOverdue(assignment.dueDate)
                      return (
                        <div
                          key={assignment.id}
                          className={`rounded-xl bg-white/80 shadow-md px-4 py-3 border cursor-pointer hover:shadow-lg transition-all ${
                            isOverdueAssignment 
                              ? 'border-red-200 hover:border-red-300' 
                              : 'border-purple-100 hover:border-purple-200'
                          }`}
                          onClick={() => router.push(`/courses/${assignment.courseId}/assignments/${assignment.id}`)}
                        >
                          <div className="flex items-start gap-3">
                            <BookOpen className={`w-5 h-5 mt-0.5 ${
                              isOverdueAssignment ? 'text-red-400' : 'text-purple-400'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm text-gray-900 mb-1 truncate">
                                {assignment.title}
                              </div>
                              <div className="text-xs text-purple-500 mb-1">
                                {assignment.courseTitle}
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="text-xs text-gray-500">
                                  Due: {formatDueTime(assignment.dueDate)}
                                </div>
                                {isOverdueAssignment && (
                                  <span className="text-xs text-red-600 font-medium">
                                    Overdue
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        }
      >
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-center mb-4">
            <div className="text-lg font-semibold text-purple-800">My Courses</div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGrades(!showGrades)}
              className="flex items-center gap-2"
            >
              {showGrades ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showGrades ? 'Hide Grades' : 'Show Grades'}
            </Button>
          </div>
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400"></div>
            </div>
          ) : enrolledCourses.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <p className="text-purple-400">You haven't enrolled in any courses yet.</p>
              <Button className="mt-4" onClick={() => router.push('/courses')}>
                Browse Courses
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 overflow-y-auto pr-2" style={{ maxHeight: '70vh' }}>
              {enrolledCourses.map(course => (
                <div
                  key={course.id}
                  className="rounded-2xl bg-white/80 shadow-lg border border-purple-100 p-6 flex flex-col justify-between cursor-pointer hover:scale-[1.02] hover:shadow-xl transition-all min-h-[140px] relative"
                  onClick={() => router.push(`/courses/${course.id}`)}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <User2 className="w-5 h-5 text-purple-400" />
                    <div className="text-base font-bold text-purple-900">{course.title}</div>
                  </div>
                  <div className="text-xs text-purple-500 mb-1">{course.description}</div>
                  <div className="text-xs text-purple-600 mt-auto">Instructor: {course.instructor.name}</div>
                  
                  {/* Grade Display */}
                  {showGrades && (
                    <div 
                      className="absolute bottom-3 right-3 cursor-pointer hover:scale-110 transition-transform duration-200"
                      onClick={(e) => {
                        e.stopPropagation() // Prevent triggering the course card click
                        router.push(`/gradebook?courseId=${course.id}`)
                      }}
                    >
                      {gradesLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400"></div>
                      ) : course.grade ? (
                        <div className="text-right bg-white/90 rounded-lg px-2 py-1 shadow-sm hover:shadow-md transition-shadow hover:bg-purple-50">
                          <div className="text-sm font-semibold text-purple-700">
                            {course.grade.letter}
                          </div>
                          <div className="text-xs text-purple-500">
                            {course.grade.percentage.toFixed(1)}%
                          </div>
                        </div>
                      ) : (
                        <div className="text-right bg-white/90 rounded-lg px-2 py-1 shadow-sm hover:shadow-md transition-shadow hover:bg-purple-50">
                          <div className="text-sm font-semibold text-gray-400">N/A</div>
                          <div className="text-xs text-gray-400">No grades</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
} 