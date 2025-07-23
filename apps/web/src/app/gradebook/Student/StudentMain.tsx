"use client"
import { useState } from 'react'
import { GradebookCourse } from '../types'
import { MyGrades } from './MyGrades'

export function StudentMain({ course }: { course: GradebookCourse }) {
  return <MyGrades course={course} />
} 