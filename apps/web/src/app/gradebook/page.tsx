"use client"
import { GradebookProvider } from './GradebookContext'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { GradebookSidebar } from './GradebookSidebar'
import { GradebookMain } from './GradebookMain'

export default function GradebookPage() {
  return (
    <DashboardLayout>
      <GradebookProvider>
        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <GradebookSidebar />
          {/* Main Content */}
          <main className="flex-1 p-6 overflow-y-auto">
            <GradebookMain />
          </main>
        </div>
      </GradebookProvider>
    </DashboardLayout>
  )
} 