'use client'

import { useState } from 'react'
import { Button } from '@lms/ui'

interface Course {
  id: string
  title: string
  description: string
  instructor: {
    id: string
    name: string
    email: string
  }
  isPublished: boolean
  isFree: boolean
  price?: number
  createdAt: string
}

interface CourseListProps {
  courses: Course[]
  loading: boolean
  onCourseUpdated: () => void
}

export function CourseList({ courses, loading, onCourseUpdated }: CourseListProps) {
  const [deletingCourse, setDeletingCourse] = useState<string | null>(null)

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course?')) {
      return
    }

    setDeletingCourse(courseId)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses/${courseId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        onCourseUpdated()
      } else {
        alert('Failed to delete course')
      }
    } catch (error) {
      alert('Failed to delete course')
    } finally {
      setDeletingCourse(null)
    }
  }

  const handleTogglePublish = async (courseId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isPublished: !currentStatus,
        }),
      })

      if (response.ok) {
        onCourseUpdated()
      } else {
        alert('Failed to update course')
      }
    } catch (error) {
      alert('Failed to update course')
    }
  }

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">All Courses</h3>
        <p className="text-sm text-gray-600">Manage course information and settings</p>
      </div>

      {courses.length === 0 ? (
        <div className="px-6 py-8 text-center">
          <p className="text-gray-500">No courses found. Create your first course!</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {courses.map(course => (
            <div key={course.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h4 className="text-lg font-medium text-gray-900">{course.title}</h4>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      course.isPublished 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {course.isPublished ? 'Published' : 'Draft'}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      course.isFree 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {course.isFree ? 'Free' : `$${course.price}`}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{course.description}</p>
                  <div className="mt-2 text-sm text-gray-500">
                    <span className="font-medium">Instructor:</span> {course.instructor.name} ({course.instructor.email})
                  </div>
                  <div className="mt-1 text-xs text-gray-400">
                    Created: {new Date(course.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTogglePublish(course.id, course.isPublished)}
                  >
                    {course.isPublished ? 'Unpublish' : 'Publish'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`/dashboard/admin/courses/${course.id}`, '_blank')}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteCourse(course.id)}
                    disabled={deletingCourse === course.id}
                  >
                    {deletingCourse === course.id ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 