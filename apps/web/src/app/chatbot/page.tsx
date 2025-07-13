'use client'

import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { Button } from '@lms/ui'
import { Bot, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ChatbotPage() {
  const router = useRouter()

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-purple-900">AI Learning Assistant</h1>
            <p className="text-purple-600 mt-2">Get help with your studies and course content</p>
          </div>

          {/* Coming Soon Card */}
          <div className="bg-white/80 rounded-2xl shadow-lg border border-purple-100 p-12 text-center">
            <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Bot className="w-12 h-12 text-purple-600" />
            </div>
            <h2 className="text-2xl font-semibold text-purple-900 mb-4">AI Assistant Coming Soon</h2>
            <p className="text-purple-600 mb-6 max-w-md mx-auto">
              We're developing an intelligent learning assistant to help you with questions, 
              explanations, and personalized study guidance.
            </p>
            <div className="space-y-3">
              <div className="text-sm text-purple-500">
                • Ask questions about course content
              </div>
              <div className="text-sm text-purple-500">
                • Get personalized study recommendations
              </div>
              <div className="text-sm text-purple-500">
                • 24/7 learning support and guidance
              </div>
            </div>
            <div className="mt-8">
              <Button 
                variant="outline" 
                onClick={() => router.push('/dashboard')}
                className="border-purple-200 text-purple-700 hover:bg-purple-50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
} 