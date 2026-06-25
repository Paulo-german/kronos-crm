'use client'

import { useState } from 'react'
import { Filter } from 'lucide-react'
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
import { Badge } from '@/_components/ui/badge'
import type { ContactFilters } from '../_lib/contact-filters'
import { DEFAULT_CONTACT_FILTERS } from '../_lib/contact-filters'
import { ContactFilterControls } from './contact-filter-controls'

interface ContactsFiltersSheetProps {
  filters: ContactFilters
  onApplyFilters: (filters: Partial<ContactFilters>) => void
  activeFilterCount: number
  isScoreEnabled: boolean
}

export function ContactsFiltersSheet({
  filters,
  onApplyFilters,
  activeFilterCount,
  isScoreEnabled,
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

        <div className="flex-1 overflow-y-auto py-4">
          <ContactFilterControls
            filters={localFilters}
            onChange={setLocalFilters}
            isScoreEnabled={isScoreEnabled}
          />
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
