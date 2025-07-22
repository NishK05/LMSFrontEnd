import { ReactNode } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@lms/ui'
import {
  MessageCircle,
  Calendar,
  Bot,
  Settings as SettingsIcon
} from 'lucide-react'
import clsx from 'clsx'

interface DashboardLayoutProps {
  children: ReactNode
  rightSidebar?: ReactNode
}

export function DashboardLayout({ children, rightSidebar }: DashboardLayoutProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const userName = session?.user?.name || 'Student'

  // Function to route to the correct dashboard
  const goToDashboard = () => {
    const role = session?.user?.role
    if (role === 'ADMIN') {
      router.push('/dashboard/admin')
    } else if (role === 'TEACHER') {
      router.push('/dashboard/teacher')
    } else {
      router.push('/dashboard/student')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-white to-purple-200 flex flex-col">
      {/* Glass Top Bar */}
      <div
        className={clsx(
          'sticky top-0 z-30 w-full flex items-center justify-between px-12 py-5',
          'backdrop-blur-md bg-purple-400/60 rounded-b-2xl shadow-lg',
          'border-b border-purple-200',
          'transition-all duration-300',
          'glass-navbar'
        )}
        style={{
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        }}
      >
        <button
          type="button"
          onClick={goToDashboard}
          className="text-2xl font-bold text-white drop-shadow-sm focus:outline-none hover:underline hover:opacity-90 transition"
          aria-label="Go to Dashboard"
        >
          {userName}'s Dashboard
        </button>
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/discussions')}>
            <MessageCircle className="w-7 h-7 text-white/90" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => router.push('/calendar')}>
            <Calendar className="w-7 h-7 text-white/90" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => router.push('/chatbot')}>
            <Bot className="w-7 h-7 text-white/90" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => router.push('/settings')}>
            <SettingsIcon className="w-7 h-7 text-white/90" />
          </Button>
        </div>
      </div>
      {/* Main Content Layout */}
      <div className="flex-1 flex flex-col md:flex-row gap-6 px-4 md:px-8 py-6 w-full max-w-7xl mx-auto">
        {/* Main (left/center) */}
        <div className="flex-1 min-w-0">{children}</div>
        {/* Right Sidebar (To Do's) */}
        {rightSidebar && (
          <aside className="w-full md:w-80 flex-shrink-0 mt-8 md:mt-0">
            {rightSidebar}
          </aside>
        )}
      </div>
    </div>
  )
} 