'use client'

import DiscussionBoardWithProvider from './DiscussionBoard'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'

export default function DiscussionsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <DiscussionBoardWithProvider />
      </DashboardLayout>
    </ProtectedRoute>
  )
} 