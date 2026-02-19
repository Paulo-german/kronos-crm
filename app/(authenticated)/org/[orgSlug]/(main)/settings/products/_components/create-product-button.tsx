'use client'

import { useState } from 'react'
import { Button } from '@/_components/ui/button'
import { Plus } from 'lucide-react'
import { Dialog, DialogTrigger } from '@/_components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/_components/ui/tooltip'
import UpsertProductDialogContent from './upsert-dialog-content'

interface CreateProductButtonProps {
  withinQuota?: boolean
}

const CreateProductButton = ({ withinQuota = true }: CreateProductButtonProps) => {
  const [isOpen, setIsOpen] = useState(false)

  if (!withinQuota) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <span tabIndex={0}>
            <Button disabled>
              <Plus className="mr-2 h-4 w-4" />
              Novo Produto
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>Limite atingido. Faca upgrade do plano.</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo Produto
        </Button>
      </DialogTrigger>
      <UpsertProductDialogContent setIsOpen={setIsOpen} isOpen={isOpen} />
    </Dialog>
  )
}

export default CreateProductButton
