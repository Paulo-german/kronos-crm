'use client'

import { useState } from 'react'
import { Button } from '@/_components/ui/button'
import { Plus } from 'lucide-react'
import { Sheet, SheetTrigger } from '@/_components/ui/sheet'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
import UpsertContactDialogContent from './upsert-dialog-content'
import { CompanyDto } from '@/_data-access/company/get-companies'
import type { PipelineStageSimple } from '@/_data-access/pipeline/get-default-pipeline-with-stages'
import type { FieldDefinitionDto } from '@/_lib/custom-fields/types'

interface CreateContactButtonProps {
  companyOptions: CompanyDto[]
  withinQuota?: boolean
  pipelineStages?: PipelineStageSimple[]
  customFieldDefinitions?: FieldDefinitionDto[]
}

const CreateContactButton = ({
  companyOptions,
  withinQuota = true,
  pipelineStages = [],
  customFieldDefinitions = [],
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
        <TooltipContent>Limite atingido. Faça upgrade do plano.</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button data-tour="contacts-create">
          <Plus className="mr-2 h-4 w-4" />
          Novo Contato
        </Button>
      </SheetTrigger>
      <UpsertContactDialogContent
        open={isOpen}
        setIsOpen={setIsOpen}
        companyOptions={companyOptions}
        pipelineStages={pipelineStages}
        customFieldDefinitions={customFieldDefinitions}
      />
    </Sheet>
  )
}

export default CreateContactButton
