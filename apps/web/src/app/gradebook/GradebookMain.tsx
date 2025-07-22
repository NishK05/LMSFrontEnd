"use client"
import { useSession } from 'next-auth/react'
import { useGradebookContext } from './GradebookContext'
import { TeacherMain } from './Teacher/TeacherMain'
import { StudentMain } from './Student/StudentMain'

export function GradebookMain() {
  const { data: session } = useSession()
  const { selectedCourse } = useGradebookContext()
  const role = session?.user?.role

  if (!selectedCourse) {
    return <div className="text-purple-400">Select a course to view gradebook details.</div>
  }

  if (role === 'TEACHER' || role === 'ADMIN') {
    return <TeacherMain course={selectedCourse} />
  }
  return <StudentMain course={selectedCourse} />
} 