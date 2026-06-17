'use client'

import { useState } from 'react'
import { PlusIcon } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Sheet, SheetTrigger } from '@/_components/ui/sheet'
import { cn } from '@/_lib/utils'
import { UpsertTaskDialogContent } from './upsert-dialog-content'

interface CreateTaskButtonProps {
  className?: string
}

const CreateTaskButton = ({ className }: CreateTaskButtonProps) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button className={cn('gap-2', className)}>
          <PlusIcon className="h-4 w-4" />
          Nova Tarefa
        </Button>
      </SheetTrigger>
      <UpsertTaskDialogContent setIsOpen={setIsOpen} />
    </Sheet>
  )
}

export default CreateTaskButton
