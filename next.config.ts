import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['ioredis', 'pdf-parse'],
  experimental: {
    staleTimes: {
      dynamic: 120,
    },
    serverActions: {
      bodySizeLimit: '25mb',
    },
  },
}

export default nextConfig
