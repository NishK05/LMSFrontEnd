"use client"
import { GradebookCourse } from '../types'
export function WhatIfTool({ course }: { course: GradebookCourse }) {
  return <div className="text-purple-700">[What-If Tool UI for {course.title}]</div>
} 