'use client'

import { useState } from 'react'
import { Button } from '@/_components/ui/button'
import { Plus } from 'lucide-react'
import { Dialog, DialogTrigger } from '@/_components/ui/dialog'
import UpsertContactDialogContent from './upsert-dialog-content'
import { CompanyDto } from '@/_data-access/company/get-companies'

interface CreateContactButtonProps {
  companyOptions: CompanyDto[]
}

const CreateContactButton = ({ companyOptions }: CreateContactButtonProps) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo Contato
        </Button>
      </DialogTrigger>
      <UpsertContactDialogContent
        setIsOpen={setIsOpen}
        companyOptions={companyOptions}
      />
    </Dialog>
  )
}

export default CreateContactButton
