/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/gradebook/:path*',
        destination: 'http://localhost:3001/api/gradebook/:path*', // Proxy only gradebook API
      },
      // Add other backend API proxies here if needed
    ]
  },
}

module.exports = nextConfig 