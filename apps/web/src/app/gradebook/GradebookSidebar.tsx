"use client"
import { useState, useEffect } from 'react'
import { useGradebookContext } from './GradebookContext'
import { getUserCourses } from './api'
import { useSession } from 'next-auth/react'
import { getSections } from './api'

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

  const [courseSections, setCourseSections] = useState<{ id: string; name: string; weight: number }[]>([])
  const [sectionsLoading, setSectionsLoading] = useState(false)

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    getUserCourses(userId).then(cs => {
      setCourses(cs)
      setLoading(false)
    })
  }, [userId, setCourses, setLoading])

  // Fetch sections for selected course
  useEffect(() => {
    if (!selectedCourse) {
      setCourseSections([])
      return
    }
    setSectionsLoading(true)
    getSections(selectedCourse.id)
      .then(sections => setCourseSections(sections))
      .finally(() => setSectionsLoading(false))
  }, [selectedCourse])

  return (
    <aside className="w-48 bg-purple-50 border-r border-purple-100 p-2 h-full flex flex-col">
      <div className="font-semibold text-purple-700 mb-2">Courses</div>
      {loading ? (
        <div className="text-purple-400">Loading...</div>
      ) : courses.length === 0 ? (
        <div className="text-purple-400">No courses found.</div>
      ) : (
        <ul className="space-y-2 mb-4">
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
      {/* Course breakdown */}
      {selectedCourse && (
        <div className="mt-4">
          <div className="font-semibold text-purple-700 mb-1">Grade Breakdown:</div>
          {sectionsLoading ? (
            <div className="text-purple-400">Loading...</div>
          ) : courseSections.length === 0 ? (
            <div className="text-purple-400">No categories</div>
          ) : (
            <ul className="ml-2 text-sm">
              {courseSections.map(s => (
                <li key={s.id}>
                  {s.name}: <span className="font-semibold">{s.weight}%</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </aside>
  )
} 