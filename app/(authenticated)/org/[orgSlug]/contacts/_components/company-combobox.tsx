'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'

import { cn } from '@/_lib/utils'
import { Button } from '@/_components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/_components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/_components/ui/popover'
import { createCompanyInline } from '@/_actions/company/create-company-inline'

interface CompanyOption {
  id: string
  name: string
}

interface CompanyComboboxProps {
  value?: string
  onChange: (value: string) => void
  options: CompanyOption[]
}

export function CompanyCombobox({
  value,
  onChange,
  options: initialOptions,
}: CompanyComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [options, setOptions] = React.useState(initialOptions)
  const [inputValue, setInputValue] = React.useState('')

  const { execute: createCompany, isPending } = useAction(createCompanyInline, {
    onSuccess: ({ data }) => {
      if (data) {
        setOptions((prev) => [...prev, data])
        onChange(data.id)
        setOpen(false)
        toast.success(`Empresa "${data.name}" criada e selecionada.`)
      }
    },
    onError: () => {
      toast.error('Erro ao criar empresa.')
    },
  })

  const handleCreateCompany = () => {
    createCompany({ name: inputValue })
  }

  const selectedCompany = options.find((opt) => opt.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedCompany ? selectedCompany.name : 'Selecione uma empresa...'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput
            placeholder="Buscar empresa..."
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty className="px-2 py-2">
              <p className="mb-2 text-sm text-muted-foreground">
                Nenhuma empresa encontrada.
              </p>
              {inputValue && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 w-full"
                  onClick={handleCreateCompany}
                  disabled={isPending}
                >
                  {isPending ? (
                    'Criando...'
                  ) : (
                    <>
                      <Plus className="mr-2 h-3 w-3" />
                      Criar &quot;{inputValue}&quot;
                    </>
                  )}
                </Button>
              )}
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.name} // Importante: value aqui é usado para filtro do Command
                  onSelect={() => {
                    onChange(option.id === value ? '' : option.id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === option.id ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {option.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
