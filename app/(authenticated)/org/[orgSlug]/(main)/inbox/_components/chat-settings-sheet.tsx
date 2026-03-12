'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import {
  Check,
  ChevronsUpDown,
  ExternalLink,
  Handshake,
  Info,
  Loader2,
  Phone,
  Save,
  Unlink,
  User,
} from 'lucide-react'

import { cn } from '@/_lib/utils'
import { Badge } from '@/_components/ui/badge'
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
import { Label } from '@/_components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/_components/ui/popover'
import { Separator } from '@/_components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/_components/ui/sheet'
import { updateContact } from '@/_actions/contact/update-contact'
import { updateConversation } from '@/_actions/inbox/update-conversation'
import type { ConversationListDto } from '@/_data-access/conversation/get-conversations'
import type { DealOptionDto } from '@/_data-access/deal/get-deals-options'
import type { ContactOptionDto } from '@/_data-access/contact/get-contacts-options'

interface ChatSettingsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  conversation: ConversationListDto
  dealOptions: DealOptionDto[]
  contactOptions: ContactOptionDto[]
  orgSlug: string
}

export function ChatSettingsSheet({
  open,
  onOpenChange,
  conversation,
  dealOptions,
  contactOptions,
  orgSlug,
}: ChatSettingsSheetProps) {
  // Inline name edit
  const [editName, setEditName] = useState(conversation.contactName)
  const [contactPopoverOpen, setContactPopoverOpen] = useState(false)
  const [dealPopoverOpen, setDealPopoverOpen] = useState(false)

  const updateContactAction = useAction(updateContact, {
    onSuccess: () => {
      toast.success('Nome do contato atualizado.')
    },
    onError: (error) => {
      toast.error(error.error?.serverError ?? 'Erro ao atualizar contato.')
    },
  })

  const updateConversationAction = useAction(updateConversation, {
    onSuccess: () => {
      toast.success('Conversa atualizada.')
    },
    onError: (error) => {
      toast.error(error.error?.serverError ?? 'Erro ao atualizar conversa.')
    },
  })

  const handleSaveName = () => {
    const trimmed = editName.trim()
    if (!trimmed || trimmed === conversation.contactName) return

    updateContactAction.execute({
      id: conversation.contactId,
      name: trimmed,
    })
  }

  const handleChangeContact = (contactId: string) => {
    if (contactId === conversation.contactId) {
      setContactPopoverOpen(false)
      return
    }
    updateConversationAction.execute({
      conversationId: conversation.id,
      contactId,
    })
    setContactPopoverOpen(false)
  }

  const handleChangeDeal = (dealId: string) => {
    if (dealId === conversation.dealId) {
      setDealPopoverOpen(false)
      return
    }
    updateConversationAction.execute({
      conversationId: conversation.id,
      dealId,
    })
    setDealPopoverOpen(false)
  }

  const handleUnlinkDeal = () => {
    updateConversationAction.execute({
      conversationId: conversation.id,
      dealId: null,
    })
  }

  const channelLabel = conversation.channel === 'WHATSAPP' ? 'WhatsApp' : 'Web Chat'

  const selectedContact = contactOptions.find(
    (contact) => contact.id === conversation.contactId,
  )
  const selectedDeal = dealOptions.find(
    (deal) => deal.id === conversation.dealId,
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Configurações da Conversa</SheetTitle>
          <SheetDescription>
            Gerencie o contato, negociação e informações desta conversa.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Seção 1 - Contato */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Contato</h3>
            </div>

            {/* Nome editável */}
            <div className="space-y-2">
              <Label htmlFor="contact-name" className="text-xs text-muted-foreground">
                Nome
              </Label>
              <div className="flex gap-2">
                <Input
                  id="contact-name"
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  className="h-9"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') handleSaveName()
                  }}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={handleSaveName}
                  disabled={
                    updateContactAction.isPending ||
                    editName.trim() === conversation.contactName ||
                    !editName.trim()
                  }
                >
                  {updateContactAction.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Telefone (read-only) */}
            {conversation.contactPhone && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Telefone</Label>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  {conversation.contactPhone}
                </div>
              </div>
            )}

            {/* Link para contato */}
            <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
              <Link href={`/org/${orgSlug}/contacts/${conversation.contactId}`}>
                Ver contato
                <ExternalLink className="ml-1 h-3 w-3" />
              </Link>
            </Button>

            {/* Trocar contato */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Trocar contato</Label>
              <Popover open={contactPopoverOpen} onOpenChange={setContactPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={contactPopoverOpen}
                    className="w-full justify-between"
                    size="sm"
                  >
                    {selectedContact?.name ?? 'Selecione um contato...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar contato..." />
                    <CommandList>
                      <CommandEmpty>Nenhum contato encontrado.</CommandEmpty>
                      <CommandGroup>
                        {contactOptions.map((contact) => (
                          <CommandItem
                            key={contact.id}
                            value={contact.name}
                            onSelect={() => handleChangeContact(contact.id)}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                conversation.contactId === contact.id
                                  ? 'opacity-100'
                                  : 'opacity-0',
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{contact.name}</span>
                              {contact.phone && (
                                <span className="text-xs text-muted-foreground">
                                  {contact.phone}
                                </span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </section>

          <Separator />

          {/* Seção 2 - Negociação */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Handshake className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Negociação</h3>
            </div>

            {/* Deal vinculado */}
            {conversation.dealId && conversation.dealTitle && (
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="max-w-[200px] truncate">
                  {conversation.dealTitle}
                </Badge>
                <div className="flex items-center gap-1">
                  <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
                    <Link href={`/org/${orgSlug}/crm/deals/${conversation.dealId}`}>
                      Ver negociação
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-destructive hover:text-destructive"
                    onClick={handleUnlinkDeal}
                    disabled={updateConversationAction.isPending}
                  >
                    <Unlink className="mr-1 h-3 w-3" />
                    Desvincular
                  </Button>
                </div>
              </div>
            )}

            {/* Combobox deal */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                {conversation.dealId ? 'Trocar negociação' : 'Vincular negociação'}
              </Label>
              <Popover open={dealPopoverOpen} onOpenChange={setDealPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={dealPopoverOpen}
                    className="w-full justify-between"
                    size="sm"
                  >
                    {selectedDeal?.title ?? 'Selecione uma negociação...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar negociação..." />
                    <CommandList>
                      <CommandEmpty>Nenhuma negociação encontrada.</CommandEmpty>
                      <CommandGroup>
                        {dealOptions.map((deal) => (
                          <CommandItem
                            key={deal.id}
                            value={deal.title}
                            onSelect={() => handleChangeDeal(deal.id)}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                conversation.dealId === deal.id
                                  ? 'opacity-100'
                                  : 'opacity-0',
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{deal.title}</span>
                              {deal.contactName && (
                                <span className="text-xs text-muted-foreground">
                                  {deal.contactName}
                                </span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </section>

          <Separator />

          {/* Seção 3 - Info */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Informações</h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Canal</span>
                <Badge variant="outline" className="text-xs">
                  {channelLabel}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Inbox</span>
                <span className="text-sm">{conversation.inboxName}</span>
              </div>

              {conversation.agentName && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Agente IA</span>
                  <Badge
                    variant="outline"
                    className="border-kronos-purple/20 bg-kronos-purple/10 text-xs text-kronos-purple"
                  >
                    {conversation.agentName}
                  </Badge>
                </div>
              )}
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}
