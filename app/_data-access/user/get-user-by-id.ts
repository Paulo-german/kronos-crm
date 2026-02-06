import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'

async function fetchUserById(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      avatarUrl: true,
      createdAt: true,
    },
  })
}

export const getUserById = cache(async (userId: string) => {
  const getCachedUser = unstable_cache(
    async () => fetchUserById(userId),
    [`user-${userId}`],
    {
      tags: [`user:${userId}`],
      revalidate: 3600,
    },
  )
  return getCachedUser()
})
