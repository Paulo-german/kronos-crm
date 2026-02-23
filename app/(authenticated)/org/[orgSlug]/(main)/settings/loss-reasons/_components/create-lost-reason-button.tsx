'use client'

import { useState } from 'react'
import { Button } from '@/_components/ui/button'
import { Plus } from 'lucide-react'
import { Sheet, SheetTrigger } from '@/_components/ui/sheet'
import UpsertLostReasonDialog from './upsert-lost-reason-dialog'

const CreateLostReasonButton = () => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo Motivo
        </Button>
      </SheetTrigger>
      <UpsertLostReasonDialog setIsOpen={setIsOpen} isOpen={isOpen} />
    </Sheet>
  )
}

export default CreateLostReasonButton
