'use client'

import { useState } from 'react'
import { PlusIcon } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Sheet, SheetTrigger } from '@/_components/ui/sheet'
import { UpsertTaskDialogContent } from './upsert-dialog-content'

import { DealOptionDto } from '@/_data-access/deal/get-deals-options'

interface CreateTaskButtonProps {
  dealOptions: DealOptionDto[]
}

const CreateTaskButton = ({ dealOptions }: CreateTaskButtonProps) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button className="gap-2">
          <PlusIcon className="h-4 w-4" />
          Nova Tarefa
        </Button>
      </SheetTrigger>
      <UpsertTaskDialogContent
        setIsOpen={setIsOpen}
        dealOptions={dealOptions}
      />
    </Sheet>
  )
}

export default CreateTaskButton
