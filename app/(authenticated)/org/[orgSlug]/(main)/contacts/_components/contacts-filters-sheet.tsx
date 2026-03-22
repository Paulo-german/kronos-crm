'use client'

import { useState } from 'react'
import { Filter, X } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from '@/_components/ui/sheet'
import { Button } from '@/_components/ui/button'
import { Checkbox } from '@/_components/ui/checkbox'
import { Label } from '@/_components/ui/label'
import { Badge } from '@/_components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { cn } from '@/_lib/utils'
import type { ContactFilters } from '../_lib/contact-filters'
import { DEFAULT_CONTACT_FILTERS } from '../_lib/contact-filters'
import type { CompanyDto } from '@/_data-access/company/get-companies'

interface ContactsFiltersSheetProps {
  companyOptions: CompanyDto[]
  filters: ContactFilters
  onApplyFilters: (filters: Partial<ContactFilters>) => void
  activeFilterCount: number
}

export function ContactsFiltersSheet({
  companyOptions,
  filters,
  onApplyFilters,
  activeFilterCount,
}: ContactsFiltersSheetProps) {
  const [localFilters, setLocalFilters] = useState<ContactFilters>(filters)
  const [isOpen, setIsOpen] = useState(false)

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setLocalFilters(filters)
    }
    setIsOpen(open)
  }

  const handleApplyFilters = () => {
    onApplyFilters(localFilters)
    setIsOpen(false)
  }

  const handleClearLocal = () => {
    setLocalFilters(DEFAULT_CONTACT_FILTERS)
  }

  /** Alterna um filtro boolean exclusivo — clica novamente para deselecionar */
  const toggleBooleanFilter = (
    field: 'isDecisionMaker' | 'hasDeals',
    value: boolean,
  ) => {
    const current = localFilters[field]
    setLocalFilters({
      ...localFilters,
      [field]: current === value ? null : value,
    })
  }

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="soft" className="gap-2">
          <Filter className="h-4 w-4" />
          Filtros
          {activeFilterCount > 0 && (
            <Badge className="ml-1 h-5 min-w-5 bg-primary/30 px-1.5 text-xs text-primary hover:bg-primary/30">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Filtros Avançados</SheetTitle>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto py-4">
          {/* Filtro de Empresa */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Empresa</Label>
            <Select
              value={localFilters.companyId ?? 'all'}
              onValueChange={(value) =>
                setLocalFilters({
                  ...localFilters,
                  companyId: value === 'all' ? null : value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas as empresas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as empresas</SelectItem>
                {companyOptions.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {localFilters.companyId && (
              <button
                onClick={() =>
                  setLocalFilters({ ...localFilters, companyId: null })
                }
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
                Limpar empresa
              </button>
            )}
          </div>

          {/* Filtro de Decisor */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Tomador de Decisão</Label>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { value: true, label: 'Sim' },
                  { value: false, label: 'Não' },
                ] as const
              ).map((option) => (
                <label
                  key={String(option.value)}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 transition-colors',
                    localFilters.isDecisionMaker === option.value
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : 'border-input hover:bg-accent',
                  )}
                >
                  <Checkbox
                    checked={localFilters.isDecisionMaker === option.value}
                    onCheckedChange={() =>
                      toggleBooleanFilter('isDecisionMaker', option.value)
                    }
                    className="sr-only"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Filtro de Tem Negócios */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Tem Negócios</Label>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { value: true, label: 'Sim' },
                  { value: false, label: 'Não' },
                ] as const
              ).map((option) => (
                <label
                  key={String(option.value)}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 transition-colors',
                    localFilters.hasDeals === option.value
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : 'border-input hover:bg-accent',
                  )}
                >
                  <Checkbox
                    checked={localFilters.hasDeals === option.value}
                    onCheckedChange={() =>
                      toggleBooleanFilter('hasDeals', option.value)
                    }
                    className="sr-only"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <SheetFooter className="flex-row gap-2 border-t pt-4">
          <Button
            variant="outline"
            onClick={handleClearLocal}
            className="flex-1"
          >
            Limpar
          </Button>
          <SheetClose asChild>
            <Button onClick={handleApplyFilters} className="flex-1">
              Aplicar Filtros
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
