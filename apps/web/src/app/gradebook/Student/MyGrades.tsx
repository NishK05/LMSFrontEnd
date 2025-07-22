"use client"
import { GradebookCourse } from '../types'
export function MyGrades({ course }: { course: GradebookCourse }) {
  return <div className="text-purple-700">[My Grades UI for {course.title}]</div>
} 