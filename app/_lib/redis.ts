import Redis from 'ioredis'

let redisInstance: Redis | null = null

export function getRedis(): Redis {
  if (!redisInstance) {
    if (!process.env.REDIS_URL) {
      throw new Error('REDIS_URL is not configured')
    }

    redisInstance = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    })
  }

  return redisInstance
}

export const redis = new Proxy({} as Redis, {
  get(_, prop) {
    return Reflect.get(getRedis(), prop)
  },
})
