export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">
            About Our LMS
          </h1>
          <p className="mt-4 text-xl text-gray-600">
            A modern learning management system built for the future of education
          </p>
        </div>

        <div className="mt-16 space-y-12">
          {/* Mission */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h2>
            <p className="text-gray-600 leading-relaxed">
              We believe that education should be accessible, engaging, and personalized. 
              Our Learning Management System is designed to provide students and instructors 
              with the tools they need to create meaningful learning experiences.
            </p>
          </div>

          {/* Features */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Key Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Interactive Learning</h3>
                <p className="text-gray-600">
                  Engage with course content through interactive lessons, quizzes, and discussions.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Progress Tracking</h3>
                <p className="text-gray-600">
                  Monitor your learning progress with detailed analytics and insights.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Flexible Access</h3>
                <p className="text-gray-600">
                  Access your courses anytime, anywhere with our responsive design.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Collaborative Learning</h3>
                <p className="text-gray-600">
                  Connect with peers and instructors through integrated communication tools.
                </p>
              </div>
            </div>
          </div>

          {/* Technology */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Built with Modern Technology</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">Next.js</div>
                <div className="text-sm text-gray-600">React Framework</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">TypeScript</div>
                <div className="text-sm text-gray-600">Type Safety</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">Tailwind CSS</div>
                <div className="text-sm text-gray-600">Styling</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">Prisma</div>
                <div className="text-sm text-gray-600">Database ORM</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 