'use client'

import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Globe, Factory } from 'lucide-react'
import { CompanyCombobox } from '@/_components/contacts/_components/company-combobox'
import { updateDeal } from '@/_actions/deal/update-deal'
import type { DealDetailsDto } from '@/_data-access/deal/get-deal-details'
import type { CompanyDto } from '@/_data-access/company/get-companies'
import CollapsibleCard from './collapsible-card'

interface CompanyWidgetProps {
  deal: DealDetailsDto
  companies: CompanyDto[]
}

const CompanyWidget = ({ deal, companies }: CompanyWidgetProps) => {
  const { execute, isPending } = useAction(updateDeal, {
    onSuccess: () => {
      toast.success('Empresa atualizada!')
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao atualizar empresa.')
    },
  })

  const handleChange = (companyId: string) => {
    execute({ id: deal.id, companyId: companyId || null })
  }

  return (
    <CollapsibleCard
      title="Empresa"
      summary={
        deal.companyId ? (
          <div className="space-y-1.5">
            <p className="truncate text-sm font-medium text-foreground">
              {deal.companyName}
            </p>
            {(deal.companyDomain || deal.companyIndustry) && (
              <div className="space-y-1">
                {deal.companyDomain && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Globe className="h-3 w-3 shrink-0" />
                    <span className="truncate">{deal.companyDomain}</span>
                  </p>
                )}
                {deal.companyIndustry && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Factory className="h-3 w-3 shrink-0" />
                    <span className="truncate">{deal.companyIndustry}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">
            Nenhuma empresa vinculada
          </span>
        )
      }
    >
      <div className="space-y-3">
        <CompanyCombobox
          value={deal.companyId ?? undefined}
          onChange={handleChange}
          options={companies}
          className={isPending ? 'pointer-events-none opacity-60' : undefined}
        />

        {deal.companyId && (deal.companyDomain || deal.companyIndustry) && (
          <div className="space-y-1 rounded-md border bg-background p-3">
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
        )}
      </div>
    </CollapsibleCard>
  )
}

export default CompanyWidget
