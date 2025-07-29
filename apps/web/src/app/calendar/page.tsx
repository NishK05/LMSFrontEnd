'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { Calendar, ArrowLeft } from 'lucide-react'
import { Button } from '@lms/ui'

interface Assignment {
  id: string
  title: string
  description: string
  dueDate: string
  courseTitle: string
  courseId: string
}

export default function CalendarPage() {
  const { data: sessionRaw } = useSession()
  const session = sessionRaw as (typeof sessionRaw & { user?: { id?: string; name?: string | null; email?: string | null; image?: string | null; role?: string } })
  const router = useRouter()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user?.role !== 'STUDENT') {
      return
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
        setAssignments([])
      } finally {
        setLoading(false)
      }
    }

    fetchAssignments()
  }, [session])

  // Sort assignments by due date
  const sortedAssignments = [...assignments].sort((a, b) => {
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  })

  // Group assignments by month
  const groupAssignmentsByMonth = (assignments: Assignment[]) => {
    const groups: { [month: string]: Assignment[] } = {}
    
    assignments.forEach(assignment => {
      const date = new Date(assignment.dueDate)
      const monthKey = date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long' 
      })
      
      if (!groups[monthKey]) {
        groups[monthKey] = []
      }
      groups[monthKey].push(assignment)
    })
    
    return groups
  }

  const groupedAssignments = groupAssignmentsByMonth(sortedAssignments)

  if (session?.user?.role !== 'STUDENT') {
    return null
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Calendar className="w-6 h-6 text-purple-600" />
              <h1 className="text-2xl font-bold text-purple-800">Assignment Calendar</h1>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400"></div>
            </div>
          ) : assignments.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <Calendar className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg">No assignments found</p>
              <p className="text-gray-400 text-sm mt-2">You're all caught up!</p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedAssignments).map(([month, monthAssignments]) => (
                <div key={month} className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold text-purple-800 mb-4">{month}</h2>
                  <div className="space-y-3">
                    {monthAssignments.map(assignment => {
                      const dueDate = new Date(assignment.dueDate)
                      const isOverdue = dueDate < new Date()
                      const isToday = dueDate.toDateString() === new Date().toDateString()
                      
                      return (
                        <div
                          key={assignment.id}
                          className={`p-4 rounded-lg border cursor-pointer hover:shadow-md transition-all ${
                            isOverdue 
                              ? 'border-red-200 bg-red-50' 
                              : isToday 
                                ? 'border-yellow-200 bg-yellow-50'
                                : 'border-purple-100 hover:border-purple-200'
                          }`}
                          onClick={() => router.push(`/courses/${assignment.courseId}/assignments/${assignment.id}`)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900 mb-1">
                                {assignment.title}
                              </h3>
                              <p className="text-sm text-purple-600 mb-2">
                                {assignment.courseTitle}
                              </p>
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span>
                                  Due: {dueDate.toLocaleDateString()} at {dueDate.toLocaleTimeString([], { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </span>
                                {isOverdue && (
                                  <span className="text-red-600 font-medium">Overdue</span>
                                )}
                                {isToday && !isOverdue && (
                                  <span className="text-yellow-600 font-medium">Due Today</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
} 