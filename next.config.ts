import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['ioredis', 'pdf-parse'],
  experimental: {
    staleTimes: {
      dynamic: 120,
    },
  },
}

export default nextConfig
