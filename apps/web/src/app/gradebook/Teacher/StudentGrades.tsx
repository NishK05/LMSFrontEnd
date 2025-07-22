"use client"
import { GradebookCourse } from '../types'
export function StudentGrades({ course }: { course: GradebookCourse }) {
  return <div className="text-purple-700">[Student Grades UI for {course.title}]</div>
} 