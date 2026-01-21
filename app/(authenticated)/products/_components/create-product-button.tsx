'use client'

import { useState } from 'react'
import { Button } from '@/_components/ui/button'
import { Plus } from 'lucide-react'
import { Dialog, DialogTrigger } from '@/_components/ui/dialog'
import UpsertProductDialogContent from './upsert-dialog-content'

const CreateProductButton = () => {
  const [isOpen, setIsOpen] = useState(false)

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
