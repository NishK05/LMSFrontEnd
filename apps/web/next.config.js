/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/gradebook/:path*',
        destination: 'http://localhost:3001/api/gradebook/:path*', // Proxy only gradebook API
      },
      {
        source: '/api/assignments/:path*',
        destination: 'http://localhost:3001/api/assignments/:path*', // Proxy assignment API
      },
      {
        source: '/api/files/:path*',
        destination: 'http://localhost:3001/api/files/:path*', // Proxy files API
      },
      // Add other backend API proxies here if needed
    ]
  },
}

module.exports = nextConfig 