'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Sheet } from '@/_components/ui/sheet'
import type { ServiceCategoryDto } from '@/_data-access/service/get-service-categories'
import type { ProfessionalDto } from '@/_data-access/professional/get-professionals'
import UpsertServiceDialogContent from './upsert-service-dialog-content'

interface CreateServiceButtonProps {
  categories: ServiceCategoryDto[]
  professionals?: ProfessionalDto[]
}

const CreateServiceButton = ({ categories, professionals }: CreateServiceButtonProps) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Novo Serviço
      </Button>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <UpsertServiceDialogContent
          categories={categories}
          professionals={professionals}
          setIsOpen={setIsOpen}
          isOpen={isOpen}
        />
      </Sheet>
    </>
  )
}

export default CreateServiceButton
