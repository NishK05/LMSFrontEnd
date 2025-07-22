"use client"
import { GradebookCourse } from '../types'
export function Assignments({ course }: { course: GradebookCourse }) {
  return <div className="text-purple-700">[Assignments UI for {course.title}]</div>
} 