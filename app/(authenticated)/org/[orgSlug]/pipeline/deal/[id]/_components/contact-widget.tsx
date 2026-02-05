'use client'

import { useState } from 'react'
import {
  User,
  Mail,
  Phone,
  Briefcase,
  Copy,
  Plus,
  Check,
  ChevronsUpDown,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useAction } from 'next-safe-action/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { Button } from '@/_components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/_components/ui/dialog'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/_components/ui/alert-dialog'
import type { DealDetailsDto } from '@/_data-access/deal/get-deal-details'
import { formatPhone } from '@/_utils/format-phone'
import type { ContactDto } from '@/_data-access/contact/get-contacts'
import { addDealContact } from '@/_actions/deal/add-deal-contact'
import { removeDealContact } from '@/_actions/deal/remove-deal-contact'
import { cn } from '@/_lib/utils'

interface ContactWidgetProps {
  deal: DealDetailsDto
  contacts: ContactDto[]
}

const ContactWidget = ({ deal, contacts }: ContactWidgetProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isComboboxOpen, setIsComboboxOpen] = useState(false)
  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    null,
  )

  const { execute: executeAddContact, isPending: isAdding } = useAction(
    addDealContact,
    {
      onSuccess: () => {
        toast.success('Contato adicionado com sucesso!')
        setIsDialogOpen(false)
        setSelectedContactId(null)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao adicionar contato.')
      },
    },
  )

  const { execute: executeRemoveContact } = useAction(removeDealContact, {
    onSuccess: () => {
      toast.success('Contato removido com sucesso!')
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao remover contato.')
    },
  })

  // Filtrar contatos que JÁ estão no deal para não mostrar na lista
  const availableContacts = contacts.filter(
    (c) => !deal.contacts.some((dc) => dc.contactId === c.id),
  )

  const handleAddContact = () => {
    if (!selectedContactId) return
    executeAddContact({
      dealId: deal.id,
      contactId: selectedContactId,
      isPrimary: deal.contacts.length === 0, // Se for o primeiro, vira primary
    })
  }

  const handleRemoveContact = (contactId: string) => {
    executeRemoveContact({
      dealId: deal.id,
      contactId,
    })
  }

  // Helper para copiar texto
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copiado!`)
  }

  // Helper para formatar número para WhatsApp (remove caracteres não numéricos)
  const formatPhoneForWhatsApp = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '')
    // Adiciona código do país se não tiver (assumindo Brasil +55)
    if (cleaned.length === 11 || cleaned.length === 10) {
      return `55${cleaned}`
    }
    return cleaned
  }

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ')
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  // Se não houver contato vinculado (removido bloco aqui pois agora renderizamos dentro do return principal para manter o header com botão de adicionar)

  // Ordenar: Primary primeiro, depois alfabético
  const sortedContacts = [...deal.contacts].sort((a, b) => {
    if (a.isPrimary && !b.isPrimary) return -1
    if (!a.isPrimary && b.isPrimary) return 1
    return a.name.localeCompare(b.name)
  })

  return (
    <>
      <Card className="border-border/50 bg-secondary/20">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold">Contatos</CardTitle>
            <span className="text-xs text-muted-foreground">
              {deal.contacts.length}
            </span>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-background"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Adicionar Contato</DialogTitle>
                <DialogDescription>
                  Selecione um contato existente para vincular a este negócio.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-4">
                <div className="flex flex-col gap-2">
                  <Popover
                    open={isComboboxOpen}
                    onOpenChange={setIsComboboxOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={isComboboxOpen}
                        className="w-full justify-between font-normal"
                      >
                        {selectedContactId
                          ? availableContacts.find(
                              (c) => c.id === selectedContactId,
                            )?.name
                          : 'Selecione um contato...'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput placeholder="Buscar contato..." />
                        <CommandList>
                          <CommandEmpty>
                            Nenhum contato encontrado.
                          </CommandEmpty>
                          <CommandGroup>
                            {availableContacts.map((contact) => (
                              <CommandItem
                                key={contact.id}
                                value={contact.name}
                                onSelect={() => {
                                  setSelectedContactId(contact.id)
                                  setIsComboboxOpen(false)
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    selectedContactId === contact.id
                                      ? 'opacity-100'
                                      : 'opacity-0',
                                  )}
                                />
                                {contact.name}
                                {contact.companyName && (
                                  <span className="ml-1 text-xs text-muted-foreground">
                                    ({contact.companyName})
                                  </span>
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    disabled={isAdding}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleAddContact}
                    disabled={!selectedContactId || isAdding}
                  >
                    {isAdding ? 'Adicionando...' : 'Adicionar'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-6">
          {deal.contacts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="rounded-full bg-muted p-4">
                <User className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Nenhum contato vinculado
              </p>
            </div>
          )}
          {sortedContacts.map((contact) => (
            <div
              key={contact.contactId}
              className="group flex items-start gap-2"
            >
              <div className="flex-1 space-y-3">
                <div className="flex items-center">
                  {/* Avatar e Nome (Bloco Clicável) */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href={`/contacts/${contact.contactId}`}
                        className="flex w-full items-center gap-3 rounded-md p-2 transition-colors hover:bg-muted/50"
                      >
                        <div className="relative">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-sm font-bold text-white shadow-md">
                            {getInitials(contact.name)}
                          </div>
                          {contact.isPrimary && (
                            <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-yellow-500 ring-2 ring-background">
                              <User className="h-2.5 w-2.5 text-white" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 overflow-hidden">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold text-primary">
                              {contact.name}
                            </p>
                            {contact.isPrimary && (
                              <span className="rounded-full bg-yellow-500/10 px-1.5 py-0.5 text-[10px] font-medium text-yellow-600">
                                Principal
                              </span>
                            )}
                          </div>
                          {contact.role && (
                            <p className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Briefcase className="h-3 w-3" />
                              {contact.role}
                            </p>
                          )}
                        </div>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Ir para página do contato</p>
                    </TooltipContent>
                  </Tooltip>
                  {/* Botão de Remover (Canto direito) */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-14 w-12 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover contato?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação removerá <b>{contact.name}</b> deste
                          negócio. O contato continuará salvo no CRM.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRemoveContact(contact.contactId)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                {/* Lista de Dados (Email/Phone em linha compacta) */}
                <div className="space-y-2">
                  {/* Email */}
                  {contact.email && (
                    <div className="group/item flex items-center justify-between gap-2 overflow-hidden rounded-md border border-border/50 bg-background/70 px-4 py-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Mail className="h-4 w-4 shrink-0" />
                        <span className="truncate text-sm">
                          {contact.email}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 shrink-0"
                        onClick={() => copyToClipboard(contact.email!, 'Email')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="group/item flex items-center justify-between gap-2 overflow-hidden rounded-md border border-border/50 bg-background/70 px-4 py-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Phone className="h-4 w-4 shrink-0" />
                        <span className="truncate text-sm">
                          {formatPhone(contact.phone)}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 shrink-0 p-0"
                          onClick={() =>
                            copyToClipboard(contact.phone!, 'Telefone')
                          }
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 shrink-0 p-0"
                          asChild
                        >
                          <a
                            href={`https://wa.me/${formatPhoneForWhatsApp(contact.phone)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <svg
                              className="h-3.5 w-3.5 text-kronos-green"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                            </svg>
                          </a>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  )
}

export default ContactWidget
