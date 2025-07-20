'use client'

import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { ChatInterface } from '@/components/chat/ChatInterface'

export default function ChatbotPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-purple-900">AI Learning Assistant</h1>
            <p className="text-purple-600 mt-2">Get help with your studies and course content</p>
          </div>

          {/* Chat Interface */}
          <div className="flex-1 min-h-0">
            <ChatInterface />
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
} 