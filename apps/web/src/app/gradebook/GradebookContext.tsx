"use client"
import React, { createContext, useContext, useState, ReactNode } from 'react'
import { GradebookCourse, GradeSection, Assignment, Grade } from './types'

interface GradebookContextValue {
  courses: GradebookCourse[]
  setCourses: (courses: GradebookCourse[]) => void
  selectedCourse: GradebookCourse | null
  setSelectedCourse: (course: GradebookCourse | null) => void
  sections: GradeSection[]
  setSections: (sections: GradeSection[]) => void
  assignments: Assignment[]
  setAssignments: (assignments: Assignment[]) => void
  grades: Grade[]
  setGrades: (grades: Grade[]) => void
  loading: boolean
  setLoading: (loading: boolean) => void
}

const GradebookContext = createContext<GradebookContextValue | undefined>(undefined)

export function GradebookProvider({ children }: { children: ReactNode }) {
  const [courses, setCourses] = useState<GradebookCourse[]>([])
  const [selectedCourse, setSelectedCourse] = useState<GradebookCourse | null>(null)
  const [sections, setSections] = useState<GradeSection[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [grades, setGrades] = useState<Grade[]>([])
  const [loading, setLoading] = useState(false)

  const value: GradebookContextValue = {
    courses,
    setCourses,
    selectedCourse,
    setSelectedCourse,
    sections,
    setSections,
    assignments,
    setAssignments,
    grades,
    setGrades,
    loading,
    setLoading,
  }

  return (
    <GradebookContext.Provider value={value}>
      {children}
    </GradebookContext.Provider>
  )
}

export function useGradebookContext() {
  const ctx = useContext(GradebookContext)
  if (!ctx) throw new Error('useGradebookContext must be used within a GradebookProvider')
  return ctx
} 