"use client"
import { useState } from 'react'
import { GradebookCourse } from '../types'
import { MyGrades } from './MyGrades'
import { WhatIfTool } from './WhatIfTool'

export function StudentMain({ course }: { course: GradebookCourse }) {
  const [tab, setTab] = useState<'grades' | 'whatif'>('grades')
  return (
    <div>
      <div className="flex gap-4 mb-4">
        <button className={`px-4 py-2 rounded ${tab === 'grades' ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700'}`} onClick={() => setTab('grades')}>My Grades</button>
        <button className={`px-4 py-2 rounded ${tab === 'whatif' ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700'}`} onClick={() => setTab('whatif')}>What-If Tool</button>
      </div>
      {tab === 'grades' && <MyGrades course={course} />}
      {tab === 'whatif' && <WhatIfTool course={course} />}
    </div>
  )
} 