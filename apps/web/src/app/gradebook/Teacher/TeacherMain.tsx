"use client"
import { useState } from 'react'
import { GradebookCourse } from '../types'
import { GradeSections } from './GradeSections'
import { Assignments } from './Assignments'
import { StudentGrades } from './StudentGrades'

export function TeacherMain({ course }: { course: GradebookCourse }) {
  const [tab, setTab] = useState<'sections' | 'assignments' | 'grades'>('sections')
  return (
    <div>
      <div className="flex gap-4 mb-4">
        <button className={`px-4 py-2 rounded ${tab === 'sections' ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700'}`} onClick={() => setTab('sections')}>Grade Sections</button>
        <button className={`px-4 py-2 rounded ${tab === 'assignments' ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700'}`} onClick={() => setTab('assignments')}>Assignments</button>
        <button className={`px-4 py-2 rounded ${tab === 'grades' ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700'}`} onClick={() => setTab('grades')}>Student Grades</button>
      </div>
      {tab === 'sections' && <GradeSections course={course} />}
      {tab === 'assignments' && <Assignments course={course} />}
      {tab === 'grades' && <StudentGrades course={course} />}
    </div>
  )
} 