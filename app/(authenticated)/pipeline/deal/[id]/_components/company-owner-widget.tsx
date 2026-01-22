'use client'

import { Building2, UserCircle, Globe, Factory } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import type { DealDetailsDto } from '@/_data-access/deal/get-deal-details'

interface CompanyOwnerWidgetProps {
  deal: DealDetailsDto
}

const CompanyOwnerWidget = ({ deal }: CompanyOwnerWidgetProps) => {
  return (
    <Card className="border-border/50 bg-secondary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">
          Empresa & Responsável
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Empresa */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            Empresa
          </div>
          {deal.companyId && deal.companyName ? (
            <div className="space-y-1.5 rounded-lg border bg-muted/30 p-3">
              <p className="font-semibold leading-tight">{deal.companyName}</p>
              <div className="space-y-1">
                {deal.companyDomain && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Globe className="h-3 w-3" />
                    {deal.companyDomain}
                  </p>
                )}
                {deal.companyIndustry && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Factory className="h-3 w-3" />
                    {deal.companyIndustry}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Não vinculada</p>
          )}
        </div>

        {/* Responsável */}
        <div className="space-y-2 border-t pt-3">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <UserCircle className="h-3.5 w-3.5" />
            Responsável
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-xs font-bold text-white">
              {deal.assigneeName
                ? deal.assigneeName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase()
                : '?'}
            </div>
            <p className="text-sm font-medium">
              {deal.assigneeName || 'Não atribuído'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default CompanyOwnerWidget
