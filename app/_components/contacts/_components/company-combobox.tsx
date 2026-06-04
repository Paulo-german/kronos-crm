'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Loader2, Pencil, Plus, X } from 'lucide-react'
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
import { Input } from '@/_components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/_components/ui/popover'
import { createCompanyInline } from '@/_actions/company/create-company-inline'
import { updateCompanyInline } from '@/_actions/company/update-company-inline'

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
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editingName, setEditingName] = React.useState('')

  const { execute: createCompany, isPending: isCreating } = useAction(createCompanyInline, {
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

  const { execute: updateCompany, isPending: isUpdating } = useAction(updateCompanyInline, {
    onSuccess: ({ data }) => {
      if (data) {
        setOptions((prev) => prev.map((opt) => (opt.id === data.id ? data : opt)))
        toast.success(`Empresa renomeada para "${data.name}".`)
        setEditingId(null)
        setEditingName('')
      }
    },
    onError: () => {
      toast.error('Erro ao renomear empresa.')
    },
  })

  const startEditing = (option: CompanyOption, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(option.id)
    setEditingName(option.name)
  }

  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(null)
    setEditingName('')
  }

  const confirmEditing = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (editingName.trim()) {
      updateCompany({ id, name: editingName.trim() })
    }
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
                  onClick={() => createCompany({ name: inputValue })}
                  disabled={isCreating}
                >
                  {isCreating ? (
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
                  value={option.name} // usado pelo Command como chave de filtro de busca
                  onSelect={() => {
                    if (editingId === option.id) return
                    onChange(option.id === value ? '' : option.id)
                    setOpen(false)
                  }}
                  className="group pr-1"
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4 shrink-0',
                      value === option.id ? 'opacity-100' : 'opacity-0',
                    )}
                  />

                  {editingId === option.id ? (
                    <div className="flex flex-1 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Input
                        autoFocus
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && editingName.trim()) updateCompany({ id: option.id, name: editingName.trim() })
                          if (e.key === 'Escape') { setEditingId(null); setEditingName('') }
                        }}
                        className="h-6 flex-1 px-1 py-0 text-sm"
                        disabled={isUpdating}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 shrink-0"
                        onClick={(e) => confirmEditing(option.id, e)}
                        disabled={isUpdating || !editingName.trim()}
                      >
                        {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 text-green-500" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 shrink-0"
                        onClick={cancelEditing}
                        disabled={isUpdating}
                      >
                        <X className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="flex-1 truncate">{option.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100"
                        onClick={(e) => startEditing(option, e)}
                      >
                        <Pencil className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
