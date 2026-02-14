import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  return new PrismaClient()
}

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>
} & typeof global

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

// Named export para uso consistente
export const db = prisma
export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma

// Force refresh for audit trail enums (updated 2)
