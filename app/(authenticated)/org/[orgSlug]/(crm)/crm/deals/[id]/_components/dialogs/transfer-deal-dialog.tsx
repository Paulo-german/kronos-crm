'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Checkbox } from '@/_components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/_components/ui/dialog'
import { Label } from '@/_components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { transferDeal } from '@/_actions/deal/transfer-deal'
import type { DealContactDto } from '@/_data-access/deal/get-deal-details'

export interface MemberDto {
  id: string
  userId: string | null
  email: string
  user: {
    fullName: string | null
    avatarUrl: string | null
  } | null
}

interface TransferDealDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dealId: string
  contacts: DealContactDto[]
  members: MemberDto[]
}

const TransferDealDialog = ({
  open,
  onOpenChange,
  dealId,
  contacts,
  members,
}: TransferDealDialogProps) => {
  const [selectedMemberId, setSelectedMemberId] = useState<string | undefined>(
    undefined,
  )
  const [cascadeContacts, setCascadeContacts] = useState(true)

  const { execute, isPending } = useAction(transferDeal, {
    onSuccess: () => {
      toast.success('Negociação transferida com sucesso!', {
        position: 'bottom-right',
      })
      setSelectedMemberId(undefined)
      setCascadeContacts(true)
      onOpenChange(false)
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao transferir negociação.', {
        position: 'bottom-right',
      })
    },
  })

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSelectedMemberId(undefined)
      setCascadeContacts(true)
    }
    onOpenChange(next)
  }

  const handleTransfer = () => {
    if (selectedMemberId) {
      execute({ dealId, newAssigneeId: selectedMemberId, cascadeContacts })
    }
  }

  const assignableMembers = members.filter((member) => member.user?.fullName)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transferir Negociação</DialogTitle>
          <DialogDescription>
            Selecione o novo responsável por esta negociação.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-owner-deal">Novo Responsável</Label>
            <Select
              value={selectedMemberId}
              onValueChange={setSelectedMemberId}
            >
              <SelectTrigger id="new-owner-deal" className="w-full">
                <SelectValue placeholder="Selecione um membro..." />
              </SelectTrigger>
              <SelectContent>
                {assignableMembers.map((member) => (
                  <SelectItem key={member.id} value={member.userId as string}>
                    {member.user?.fullName} ({member.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Checkbox de cascade para contatos vinculados */}
          <div
            className={`flex items-start gap-3 rounded-md border p-3 transition-opacity ${
              contacts.length === 0 ? 'opacity-60' : ''
            }`}
          >
            <Checkbox
              id="cascade-contacts"
              checked={contacts.length > 0 ? cascadeContacts : false}
              disabled={contacts.length === 0}
              onCheckedChange={(checked) =>
                setCascadeContacts(checked === true)
              }
              className="mt-0.5"
            />
            <div className="grid gap-1.5 leading-none">
              <Label
                htmlFor="cascade-contacts"
                className="cursor-pointer text-sm font-medium"
              >
                Transferir também os contatos vinculados
              </Label>
              {contacts.length > 0 ? (
                <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                  {contacts.map((contact) => (
                    <li
                      key={contact.contactId}
                      className="flex items-center gap-1.5"
                    >
                      <span className="h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50" />
                      {contact.name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Nenhum contato vinculado a este negócio.
                </p>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={!selectedMemberId || isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Transferindo...
              </>
            ) : (
              'Transferir'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default TransferDealDialog
