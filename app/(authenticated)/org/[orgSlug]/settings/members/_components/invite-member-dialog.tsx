'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Plus, Mail, Loader2 } from 'lucide-react'
import { inviteMember } from '@/_actions/organization/invite-member'
import { Button } from '@/_components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/_components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { Input } from '@/_components/ui/input'
import { Label } from '@/_components/ui/label'
import type { MemberRole } from '@prisma/client'

export function InviteMemberDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<MemberRole>('MEMBER')

  const { execute, isPending } = useAction(inviteMember, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success(`Convite enviado para ${email}`)
        setEmail('')
        setRole('MEMBER')
        setIsOpen(false)
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao enviar convite.')
    },
  })

  const handleInvite = () => {
    if (!email) return toast.error('Digite um e-mail.')
    execute({ email, role })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Convidar Membro
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convidar Membro</DialogTitle>
          <DialogDescription>
            Envie um convite por e-mail para um novo membro da equipe.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <div className="relative">
              <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="nome@empresa.com"
                className="pl-9"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Função</Label>
            <Select
              value={role}
              onValueChange={(val) => setRole(val as MemberRole)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MEMBER">Membro (Padrão)</SelectItem>
                <SelectItem value="ADMIN">Administrador</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Membros podem visualizar e editar dados. Administradores podem
              gerenciar configurações e convites.
            </p>
          </div>

          <Button
            className="w-full"
            onClick={handleInvite}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando Convite...
              </>
            ) : (
              'Enviar Convite'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
