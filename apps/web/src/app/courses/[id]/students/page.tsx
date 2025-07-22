'use client'

import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { User2 } from 'lucide-react'
import { Button } from '@lms/ui'

interface Student {
  id: string
  name: string
  email: string
}

export default function StudentsListPage() {
  const router = useRouter()
  const params = useParams()
  const courseId = params?.id as string
  const [students, setStudents] = useState<Student[]>([])
  const [course, setCourse] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCourse = async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses/${courseId}`)
      const data = await res.json()
      setCourse(data.data)
      setStudents(
        (data.data.enrollments || []).map((e: any) => e.user)
      )
      setLoading(false)
    }
    fetchCourse()
  }, [courseId])

  if (loading) return <div>Loading...</div>

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="flex flex-col h-full">
          {/* Course Header (clickable) */}
          <div
            className="bg-white/80 rounded-2xl shadow-lg border border-purple-100 p-6 mb-6 cursor-pointer"
            onClick={() => router.push(`/courses/${courseId}`)}
          >
            <h1 className="text-2xl font-bold text-purple-900">{course.title}</h1>
            <p className="text-purple-600">{course.description}</p>
          </div>
          {/* Students List */}
          <div className="bg-white/80 rounded-2xl shadow-lg border border-purple-100 p-6">
            <h2 className="text-xl font-semibold text-purple-900 mb-4">Students Enrolled</h2>
            <ul>
              {students.map(student => (
                <li key={student.id} className="flex items-center gap-4 py-2 border-b border-purple-50">
                  <User2 className="w-5 h-5 text-purple-400" />
                  <span className="font-medium text-purple-900">{student.name}</span>
                  <span className="text-purple-600">{student.email}</span>
                </li>
              ))}
            </ul>
            {students.length === 0 && (
              <div className="text-purple-400 mt-4">No students enrolled yet.</div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
} 