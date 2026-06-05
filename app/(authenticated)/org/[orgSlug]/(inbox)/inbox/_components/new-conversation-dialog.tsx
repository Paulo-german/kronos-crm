'use client'

import { useState, useRef, useMemo } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
  MessageSquarePlus,
  User,
  UserPlus,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAction } from 'next-safe-action/hooks'
import { Button } from '@/_components/ui/button'
import { Input } from '@/_components/ui/input'
import { Label } from '@/_components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/_components/ui/dialog'
import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/_components/ui/command'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
import { createConversation } from '@/_actions/inbox/create-conversation'
import { createContact } from '@/_actions/contact/create-contact'
import { searchContacts } from '@/_actions/contact/search-contacts'
import type { ConversationListDto } from '@/_data-access/conversation/get-conversations'

const MIN_SEARCH_CHARS = 3
const SEARCH_DEBOUNCE_MS = 300

interface InboxOption {
  id: string
  name: string
  channel: string
  isConnected: boolean
}

interface ContactResult {
  id: string
  name: string
  phone: string | null
}

interface NewConversationDialogProps {
  inboxOptions: InboxOption[]
  orgSlug: string
  onConversationCreated: (conversation: ConversationListDto) => void
}

type DialogView = 'search' | 'create'

export function NewConversationDialog({
  inboxOptions,
  orgSlug,
  onConversationCreated,
}: NewConversationDialogProps) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<DialogView>('search')
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<ContactResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedContact, setSelectedContact] = useState<ContactResult | null>(null)
  const [inlineName, setInlineName] = useState('')
  const [inlinePhone, setInlinePhone] = useState('')
  const [selectedInboxId, setSelectedInboxId] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connectedInboxes = useMemo(
    () => inboxOptions.filter((inbox) => inbox.channel === 'WHATSAPP' && inbox.isConnected),
    [inboxOptions],
  )

  const { execute: executeCreateConversation, isPending: isCreatingConversation } = useAction(
    createConversation,
    {
      onSuccess: ({ data }) => {
        if (data?.conversation) {
          toast.success('Conversa iniciada com sucesso!')
          closeDialog()
          onConversationCreated(data.conversation)
        }
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao criar conversa.')
      },
    },
  )

  const { execute: executeCreateContact, isPending: isCreatingContact } = useAction(createContact, {
    onSuccess: ({ data }) => {
      if (data?.contactId && selectedInboxId) {
        executeCreateConversation({ contactId: data.contactId, inboxId: selectedInboxId })
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao criar contato.')
    },
  })

  const isPending = isCreatingConversation || isCreatingContact

  const resetState = (nextInboxId = '') => {
    setView('search')
    setSearch('')
    setSearchResults([])
    setIsSearching(false)
    setSelectedContact(null)
    setInlineName('')
    setInlinePhone('')
    setSelectedInboxId(nextInboxId)
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }

  const closeDialog = () => {
    const autoInboxId = connectedInboxes.length === 1 ? connectedInboxes[0]!.id : ''
    setOpen(false)
    resetState(autoInboxId)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      closeDialog()
      return
    }
    const autoInboxId = connectedInboxes.length === 1 ? connectedInboxes[0]!.id : ''
    resetState(autoInboxId)
    setOpen(true)
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (value.length < MIN_SEARCH_CHARS) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    debounceRef.current = setTimeout(async () => {
      const result = await searchContacts({ query: value })
      setSearchResults(result?.data ?? [])
      setIsSearching(false)
    }, SEARCH_DEBOUNCE_MS)
  }

  const handleSelectContact = (contact: ContactResult) => {
    setSelectedContact(contact)
    setSearch('')
    setSearchResults([])
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setIsSearching(false)
  }

  const handleSwitchToCreate = () => {
    // Pré-preenche o nome com o texto digitado na busca
    setInlineName(search)
    setSearch('')
    setSearchResults([])
    setIsSearching(false)
    setView('create')
  }

  const handleBackToSearch = () => {
    setInlineName('')
    setInlinePhone('')
    setView('search')
  }

  const handleStart = () => {
    if (!selectedInboxId) return

    if (selectedContact) {
      executeCreateConversation({ contactId: selectedContact.id, inboxId: selectedInboxId })
      return
    }

    if (inlineName.trim() && inlinePhone.trim()) {
      executeCreateContact({
        name: inlineName.trim(),
        phone: inlinePhone.trim(),
        isDecisionMaker: false,
      })
    }
  }

  const hasNoConnectedInbox = connectedInboxes.length === 0
  const contactResolved =
    selectedContact !== null ||
    (view === 'create' && inlineName.trim().length > 0 && inlinePhone.trim().length > 0)
  const canStart = contactResolved && !!selectedInboxId && !isPending

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Nova conversa</p>
        </TooltipContent>
      </Tooltip>

      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus className="h-4 w-4 text-primary" />
            Nova Conversa
          </DialogTitle>
          <DialogDescription>
            {view === 'search'
              ? 'Busque um contato por nome ou telefone.'
              : 'Preencha os dados para criar um novo contato.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Seção de contato — busca ou formulário inline */}
          {view === 'search' && (
            <>
              {selectedContact ? (
                /* Chip do contato selecionado */
                <div className="space-y-2">
                  <Label>Contato selecionado</Label>
                  <div className="flex items-center gap-2 rounded-md border border-input bg-muted/30 px-3 py-2">
                    <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{selectedContact.name}</p>
                      {selectedContact.phone && (
                        <p className="text-xs text-muted-foreground">{selectedContact.phone}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 shrink-0"
                      onClick={() => setSelectedContact(null)}
                      disabled={isPending}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                /* Combobox de busca */
                <div className="space-y-2">
                  <Label>Contato</Label>
                  <Command shouldFilter={false} className="rounded-md border border-input">
                    <CommandInput
                      placeholder="Nome ou telefone..."
                      value={search}
                      onValueChange={handleSearchChange}
                      disabled={isPending}
                    />
                    <CommandList className="max-h-44">
                      {search.length < MIN_SEARCH_CHARS && (
                        <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                          Digite pelo menos 3 caracteres para buscar.
                        </div>
                      )}
                      {search.length >= MIN_SEARCH_CHARS && isSearching && (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      )}
                      {search.length >= MIN_SEARCH_CHARS && !isSearching && searchResults.length === 0 && (
                        <div className="px-3 py-3 text-center">
                          <p className="mb-2 text-sm text-muted-foreground">
                            Nenhum contato encontrado.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-xs"
                            onClick={handleSwitchToCreate}
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                            Criar contato &quot;{search}&quot;
                          </Button>
                        </div>
                      )}
                      {searchResults.map((contact) => (
                        <CommandItem
                          key={contact.id}
                          value={contact.id}
                          onSelect={() => handleSelectContact(contact)}
                          className="cursor-pointer"
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium">{contact.name}</span>
                            {contact.phone && (
                              <span className="text-xs text-muted-foreground">{contact.phone}</span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandList>
                  </Command>
                </div>
              )}
            </>
          )}

          {/* Formulário inline de criação de contato */}
          {view === 'create' && (
            <div className="space-y-3">
              <Button
                variant="ghost"
                size="sm"
                className="-mb-1 h-7 gap-1.5 px-2 text-xs"
                onClick={handleBackToSearch}
                disabled={isPending}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar para busca
              </Button>
              <div className="space-y-2">
                <Label htmlFor="nc-inline-name">Nome *</Label>
                <Input
                  id="nc-inline-name"
                  placeholder="Nome completo"
                  value={inlineName}
                  onChange={(event) => setInlineName(event.target.value)}
                  disabled={isPending}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nc-inline-phone">Telefone (com DDD) *</Label>
                <Input
                  id="nc-inline-phone"
                  placeholder="(11) 99999-9999"
                  value={inlinePhone}
                  onChange={(event) => setInlinePhone(event.target.value)}
                  type="tel"
                  disabled={isPending}
                />
              </div>
            </div>
          )}

          {/* Seletor de caixa */}
          {hasNoConnectedInbox ? (
            <div className="flex items-center gap-2 rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <div>
                <span>Nenhuma caixa conectada ao WhatsApp. </span>
                <Link
                  href={`/org/${orgSlug}/settings/inboxes`}
                  className="font-medium underline underline-offset-2"
                >
                  Configurar caixas
                </Link>
              </div>
            </div>
          ) : connectedInboxes.length > 1 ? (
            <div className="space-y-2">
              <Label>Caixa de entrada</Label>
              <Select
                value={selectedInboxId}
                onValueChange={setSelectedInboxId}
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma caixa" />
                </SelectTrigger>
                <SelectContent>
                  {connectedInboxes.map((inbox) => (
                    <SelectItem key={inbox.id} value={inbox.id}>
                      {inbox.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <p className="text-center text-xs text-muted-foreground">
              Caixa: <span className="font-medium">{connectedInboxes[0]!.name}</span>
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={closeDialog} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleStart} disabled={!canStart} className="gap-1.5">
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <MessageSquarePlus className="h-3.5 w-3.5" />
            )}
            Iniciar Conversa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
