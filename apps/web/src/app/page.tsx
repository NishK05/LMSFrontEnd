'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@lms/ui'

export default function HomePage() {
  const router = useRouter()

  const handleGetStarted = () => {
    router.push('/login')
  }

  const handleLearnMore = () => {
    router.push('/about')
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Welcome to LMS
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-600">
          A modern learning management system built with Next.js, TypeScript, and Tailwind CSS.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Button size="lg" onClick={handleGetStarted}>
            Get Started
          </Button>
          <Button variant="outline" size="lg" onClick={handleLearnMore}>
            Learn More
          </Button>
        </div>
      </div>
    </div>
  )
} 