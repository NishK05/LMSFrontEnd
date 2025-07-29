"use client"
import { GradebookProvider } from './GradebookContext'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { GradebookSidebar } from './GradebookSidebar'
import { GradebookMain } from './GradebookMain'
import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { useGradebookContext } from './GradebookContext'

function GradebookContent() {
  const searchParams = useSearchParams()
  const { courses, setSelectedCourse } = useGradebookContext()
  const courseId = searchParams?.get('courseId')

  useEffect(() => {
    if (courseId && courses.length > 0) {
      const course = courses.find(c => c.id === courseId)
      if (course) {
        setSelectedCourse(course)
      }
    }
  }, [courseId, courses, setSelectedCourse])

  return (
    <div className="flex flex-1 min-h-0">
      {/* Sidebar */}
      <GradebookSidebar />
      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto">
        <GradebookMain />
      </main>
    </div>
  )
}

export default function GradebookPage() {
  return (
    <DashboardLayout>
      <GradebookProvider>
        <GradebookContent />
      </GradebookProvider>
    </DashboardLayout>
  )
} 