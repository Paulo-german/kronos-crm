'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Sheet } from '@/_components/ui/sheet'
import UpsertProfessionalDialogContent from './upsert-professional-dialog-content'

const CreateProfessionalButton = () => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Novo Profissional
      </Button>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <UpsertProfessionalDialogContent setIsOpen={setIsOpen} isOpen={isOpen} />
      </Sheet>
    </>
  )
}

export default CreateProfessionalButton
