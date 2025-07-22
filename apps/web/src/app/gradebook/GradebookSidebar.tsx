"use client"
import { useEffect } from 'react'
import { useGradebookContext } from './GradebookContext'
import { getUserCourses } from './api'
import { useSession } from 'next-auth/react'

export function GradebookSidebar() {
  const {
    courses,
    setCourses,
    selectedCourse,
    setSelectedCourse,
    loading,
    setLoading,
  } = useGradebookContext()
  const { data: session } = useSession()
  const userId = session?.user?.id

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    getUserCourses(userId).then(cs => {
      setCourses(cs)
      setLoading(false)
    })
  }, [userId, setCourses, setLoading])

  return (
    <aside className="w-64 bg-purple-50 border-r border-purple-100 p-4 h-full flex flex-col">
      <div className="font-semibold text-purple-700 mb-2">Courses</div>
      {loading ? (
        <div className="text-purple-400">Loading...</div>
      ) : courses.length === 0 ? (
        <div className="text-purple-400">No courses found.</div>
      ) : (
        <ul className="space-y-2">
          {courses.map(course => (
            <li
              key={course.id}
              className={`px-3 py-2 rounded cursor-pointer transition-colors ${
                selectedCourse?.id === course.id
                  ? 'bg-purple-200 text-purple-900 font-bold'
                  : 'hover:bg-purple-100 text-purple-700'
              }`}
              onClick={() => setSelectedCourse(course)}
            >
              {course.title}
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
} 