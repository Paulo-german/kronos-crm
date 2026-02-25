import Redis from 'ioredis'

let redisInstance: Redis | null = null

export function getRedis(): Redis {
  if (!redisInstance) {
    if (!process.env.REDIS_URL) {
      throw new Error('REDIS_URL is not configured')
    }

    redisInstance = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        if (times > 3) return null
        return Math.min(times * 200, 2000)
      },
    })

    // Prevenir Uncaught Exception que mata o processo na Vercel
    redisInstance.on('error', (error) => {
      console.warn('[redis] Connection error (non-fatal):', error.message)
    })
  }

  return redisInstance
}

export const redis = new Proxy({} as Redis, {
  get(_, prop) {
    return Reflect.get(getRedis(), prop)
  },
})
