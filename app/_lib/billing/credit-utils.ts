import { db } from '@/_lib/prisma'

interface BalanceResult {
  available: number
  planBalance: number
  topUpBalance: number
}

/**
 * Consulta o saldo disponível da organização.
 * Retorna { available: 0, planBalance: 0, topUpBalance: 0 } se wallet não existe.
 */
export async function checkBalance(orgId: string): Promise<BalanceResult> {
  const wallet = await db.creditWallet.findUnique({
    where: { organizationId: orgId },
    select: { planBalance: true, topUpBalance: true },
  })

  if (!wallet) {
    return { available: 0, planBalance: 0, topUpBalance: 0 }
  }

  return {
    available: wallet.planBalance + wallet.topUpBalance,
    planBalance: wallet.planBalance,
    topUpBalance: wallet.topUpBalance,
  }
}

/**
 * Debita créditos da wallet da organização usando transação atômica.
 * Consome planBalance primeiro, depois topUpBalance.
 * Cria WalletTransaction com snapshot e incrementa AiUsage do mês.
 * Retorna false se saldo insuficiente (sem throw — quem chama decide).
 */
export async function debitCredits(
  orgId: string,
  amount: number,
  description: string,
  metadata?: Record<string, string | number | boolean | null | undefined>,
): Promise<boolean> {
  return db.$transaction(async (tx) => {
    const wallet = await tx.creditWallet.findUnique({
      where: { organizationId: orgId },
    })

    if (!wallet) {
      return false
    }

    const totalBalance = wallet.planBalance + wallet.topUpBalance
    if (totalBalance < amount) {
      return false
    }

    // Consumir planBalance primeiro, overflow vai para topUpBalance
    const planDebit = Math.min(wallet.planBalance, amount)
    const topUpDebit = amount - planDebit

    const newPlanBalance = wallet.planBalance - planDebit
    const newTopUpBalance = wallet.topUpBalance - topUpDebit

    // Atualizar wallet
    await tx.creditWallet.update({
      where: { id: wallet.id },
      data: {
        planBalance: newPlanBalance,
        topUpBalance: newTopUpBalance,
      },
    })

    // Criar transação de auditoria
    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'USAGE_DEBIT',
        amount: -amount,
        balanceAfterPlan: newPlanBalance,
        balanceAfterTopUp: newTopUpBalance,
        description,
        metadata: metadata ? (metadata as Record<string, string | number | boolean | null>) : undefined,
      },
    })

    // Incrementar AiUsage do mês corrente
    const now = new Date()
    const periodYear = now.getFullYear()
    const periodMonth = now.getMonth() + 1

    await tx.aiUsage.upsert({
      where: {
        organizationId_periodYear_periodMonth: {
          organizationId: orgId,
          periodYear,
          periodMonth,
        },
      },
      create: {
        organizationId: orgId,
        periodYear,
        periodMonth,
        totalMessagesUsed: 1,
        totalCreditsSpent: amount,
      },
      update: {
        totalMessagesUsed: { increment: 1 },
        totalCreditsSpent: { increment: amount },
      },
    })

    return true
  })
}
