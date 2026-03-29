'use client'

import { useState } from 'react'
import { Users2Icon, PlusIcon } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Sheet, SheetTrigger } from '@/_components/ui/sheet'
import UpsertContactDialogContent from './upsert-dialog-content'
import type { CompanyDto } from '@/_data-access/company/get-companies'

interface EmptyContactsProps {
  companyOptions: CompanyDto[]
  withinQuota: boolean
}

export function EmptyContacts({ companyOptions, withinQuota }: EmptyContactsProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="flex h-[60vh] flex-col items-center justify-center gap-6 px-4">
      <div className="relative">
        <div className="absolute inset-0 animate-pulse rounded-full bg-primary/20 blur-2xl" />
        <div className="relative flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25">
          <Users2Icon className="size-10 text-primary-foreground" />
        </div>
      </div>

      <div className="max-w-sm text-center">
        <h2 className="text-xl font-bold tracking-tight">
          Nenhum contato cadastrado
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Adicione seu primeiro contato para organizar relacionamentos, acompanhar
          negócios e centralizar informações do seu pipeline comercial.
        </p>
      </div>

      {withinQuota ? (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button className="gap-2">
              <PlusIcon className="h-4 w-4" />
              Novo Contato
            </Button>
          </SheetTrigger>
          <UpsertContactDialogContent
            setIsOpen={setIsOpen}
            companyOptions={companyOptions}
          />
        </Sheet>
      ) : (
        <Button disabled className="gap-2">
          <PlusIcon className="h-4 w-4" />
          Novo Contato
        </Button>
      )}
    </div>
  )
}
