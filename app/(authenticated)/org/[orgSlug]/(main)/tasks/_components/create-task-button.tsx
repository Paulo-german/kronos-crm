'use client'

import { useState } from 'react'
import { PlusIcon } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Dialog, DialogTrigger } from '@/_components/ui/dialog'
import { UpsertTaskDialogContent } from './upsert-dialog-content'

import { DealOptionDto } from '@/_data-access/deal/get-deals-options'

interface CreateTaskButtonProps {
  dealOptions: DealOptionDto[]
}

const CreateTaskButton = ({ dealOptions }: CreateTaskButtonProps) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <PlusIcon className="h-4 w-4" />
          Nova Tarefa
        </Button>
      </DialogTrigger>
      <UpsertTaskDialogContent
        setIsOpen={setIsOpen}
        dealOptions={dealOptions}
      />
    </Dialog>
  )
}

export default CreateTaskButton
