'use client'

import { useState } from 'react'
import { Button } from '@/_components/ui/button'
import { Plus } from 'lucide-react'
import { Sheet, SheetTrigger } from '@/_components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/_components/ui/tooltip'
import UpsertContactDialogContent from './upsert-dialog-content'
import { CompanyDto } from '@/_data-access/company/get-companies'

interface CreateContactButtonProps {
  companyOptions: CompanyDto[]
  withinQuota?: boolean
}

const CreateContactButton = ({
  companyOptions,
  withinQuota = true,
}: CreateContactButtonProps) => {
  const [isOpen, setIsOpen] = useState(false)

  if (!withinQuota) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <span tabIndex={0}>
            <Button disabled>
              <Plus className="mr-2 h-4 w-4" />
              Novo Contato
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>Limite atingido. Faca upgrade do plano.</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo Contato
        </Button>
      </SheetTrigger>
      <UpsertContactDialogContent
        setIsOpen={setIsOpen}
        companyOptions={companyOptions}
      />
    </Sheet>
  )
}

export default CreateContactButton
