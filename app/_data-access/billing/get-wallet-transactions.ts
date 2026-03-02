import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { WalletTransactionType } from '@prisma/client'

export interface WalletTransactionDto {
  id: string
  type: WalletTransactionType
  amount: number
  balanceAfterPlan: number
  balanceAfterTopUp: number
  description: string
  createdAt: Date
}

const TRANSACTIONS_LIMIT = 50

const fetchTransactionsFromDb = async (
  orgId: string,
): Promise<WalletTransactionDto[]> => {
  const wallet = await db.creditWallet.findUnique({
    where: { organizationId: orgId },
    select: { id: true },
  })

  if (!wallet) return []

  const transactions = await db.walletTransaction.findMany({
    where: { walletId: wallet.id },
    orderBy: { createdAt: 'desc' },
    take: TRANSACTIONS_LIMIT,
    select: {
      id: true,
      type: true,
      amount: true,
      balanceAfterPlan: true,
      balanceAfterTopUp: true,
      description: true,
      createdAt: true,
    },
  })

  return transactions
}

export const getWalletTransactions = cache(
  async (orgId: string): Promise<WalletTransactionDto[]> => {
    const getCached = unstable_cache(
      async () => fetchTransactionsFromDb(orgId),
      [`wallet-transactions-${orgId}`],
      {
        tags: [`credits:${orgId}`],
        revalidate: 60,
      },
    )
    return getCached()
  },
)
