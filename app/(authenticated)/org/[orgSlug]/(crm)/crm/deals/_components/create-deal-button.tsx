'use client'

import { useQueryState } from 'nuqs'
import { Button } from '@/_components/ui/button'
import { Plus } from 'lucide-react'
import { Sheet, SheetTrigger } from '@/_components/ui/sheet'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
import { DealDialogContent, type DealMemberOption } from './deal-dialog-content'
import type { StageDto } from '@/_data-access/pipeline/get-user-pipeline'

// Valor do query param `?deal` que representa o modo "criar" (edição usa o id).
const CREATE_PARAM_VALUE = 'new'

interface CreateDealButtonProps {
  stages: StageDto[]
  members?: DealMemberOption[]
  withinQuota?: boolean
  onMutationSuccess?: () => void
}

const CreateDealButton = ({
  stages,
  members = [],
  withinQuota = true,
  onMutationSuccess,
}: CreateDealButtonProps) => {
  // Abertura do dialog na URL (?deal=new) — sobrevive a remontagem/revalidação.
  const [dealParam, setDealParam] = useQueryState('deal')
  const isOpen = dealParam === CREATE_PARAM_VALUE

  const setIsOpen = (value: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof value === 'function' ? value(isOpen) : value
    setDealParam(next ? CREATE_PARAM_VALUE : null)
  }

  if (!withinQuota) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <span tabIndex={0}>
            <Button disabled className="gap-2">
              <Plus className="h-4 w-4" />
              Criar Negociação
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
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Criar Negociação
        </Button>
      </SheetTrigger>
      <DealDialogContent
        open={isOpen}
        stages={stages}
        members={members}
        setIsOpen={setIsOpen}
        onMutationSuccess={onMutationSuccess}
      />
    </Sheet>
  )
}

export default CreateDealButton
