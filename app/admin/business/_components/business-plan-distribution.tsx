'use client'

import { AlertCircle } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/_components/ui/table'
import type { BusinessMetrics } from '@/admin/business/_lib/business-calculations'

const fmt = {
  brl: (n: number) =>
    n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
  number: (n: number) => n.toLocaleString('pt-BR'),
}

interface BusinessPlanDistributionProps {
  metrics: BusinessMetrics
}

export function BusinessPlanDistribution({ metrics }: BusinessPlanDistributionProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Base de clientes atual</CardTitle>
        <CardDescription className="text-xs">
          Assinaturas ativas e em trial — lidas do banco em tempo real.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {metrics.totalCustomers === 0 ? (
          <div className="flex items-center gap-3 px-6 py-8">
            <AlertCircle className="h-5 w-5 shrink-0 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nenhuma assinatura ativa encontrada. Os cálculos de break-even e
              precificação ficam disponíveis assim que houver clientes ativos.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plano</TableHead>
                <TableHead className="text-right">Clientes ativos</TableHead>
                <TableHead className="text-right">Preço mensal</TableHead>
                <TableHead className="text-right">Créditos</TableHead>
                <TableHead className="text-right">Receita mensal</TableHead>
                <TableHead className="text-right">Custo IA mensal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">{plan.name}</TableCell>
                  <TableCell className="text-right">
                    {fmt.number(plan.activeCount)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {fmt.brl(plan.price)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {fmt.number(plan.credits)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {fmt.brl(plan.revenueBRL)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {fmt.brl(plan.aiCostBRL)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2 font-semibold">
                <TableCell>Total</TableCell>
                <TableCell className="text-right">
                  {fmt.number(metrics.totalCustomers)}
                </TableCell>
                <TableCell />
                <TableCell />
                <TableCell className="text-right">
                  {fmt.brl(metrics.totalRevenue)}
                </TableCell>
                <TableCell className="text-right">
                  {fmt.brl(metrics.totalAiCost)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
