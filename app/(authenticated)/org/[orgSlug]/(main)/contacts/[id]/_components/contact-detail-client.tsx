'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  User2,
  CreditCard,
  Briefcase,
  AxeIcon,
  UserCog,
} from 'lucide-react'

import { Button } from '@/_components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { Switch } from '@/_components/ui/switch'
import { Label } from '@/_components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/_components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'

import type { ContactDetailDto } from '@/_data-access/contact/get-contact-by-id'
import type { CompanyDto } from '@/_data-access/company/get-companies'
import { InlineTextField } from '@/_components/form-controls/inline-text-field'
import { InlineSelectField } from '@/_components/form-controls/inline-select-field'
import { useContactFieldUpdate } from '../../_hooks/use-contact-field-update'
import { formatPhone } from '@/_utils/format-phone'
import type { MemberRole } from '@prisma/client'

interface MemberDto {
  id: string
  userId: string | null
  email: string
  user: {
    fullName: string | null
    avatarUrl: string | null
  } | null
}

interface ContactDetailClientProps {
  contact: ContactDetailDto
  companies: CompanyDto[]
  members: MemberDto[]
  currentUserId: string
  userRole: MemberRole
}

const ContactDetailClient = ({
  contact,
  companies,
  members,
  currentUserId,
  userRole,
}: ContactDetailClientProps) => {
  // Hook customizado para atualização de campos
  const { updateField, isPending } = useContactFieldUpdate({
    contactId: contact.id,
  })

  // Estado para Dialog de Transferência
  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState<string | undefined>(
    undefined,
  )

  // Permissão: Admin, Owner ou se for o dono do contato
  const canTransfer =
    userRole === 'ADMIN' ||
    userRole === 'OWNER' ||
    contact.assignedTo === currentUserId

  const handleTransfer = () => {
    if (selectedMemberId) {
      // Encontrar o userId baseado no memberId selecionado (ou se o select retornar userId direto)
      // O select deve retornar o userId, pois o assignedTo é um userId
      updateField('assignedTo', selectedMemberId)
      setIsTransferOpen(false)
    }
  }

  // Filtrar membros que têm User associado (para poder assignar)
  const assignableMembers = members.filter((m) => m.user?.fullName)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/contacts">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>

        {canTransfer && userRole !== 'MEMBER' && (
          <Button variant="outline" onClick={() => setIsTransferOpen(true)}>
            <UserCog className="mr-2 h-4 w-4" />
            Transferir Contato
          </Button>
        )}
      </div>

      {/* HEADER: Nome, Cargo e Badges */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          {/* Nome */}
          <InlineTextField
            value={contact.name}
            onSave={(value) => updateField('name', value)}
            isPending={isPending}
            displayClassName="text-2xl font-bold"
            inputClassName="h-9 min-w-[300px]"
          />

          {/* Cargo */}
          <InlineTextField
            value={contact.role}
            onSave={(value) => updateField('role', value)}
            isPending={isPending}
            placeholder="Sem cargo definido"
            displayClassName="text-muted-foreground"
            inputClassName="h-8 w-[200px]"
          />
        </div>

        {/* Badges / Decisor e Tipo */}
        <div className="flex items-center gap-3"></div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Card Informações de Contato */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User2 className="h-5 w-5" />
              Informações de Contato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Responsável Atual (Visualização) */}
            <div className="flex items-center gap-2 text-sm">
              <UserCog className="h-4 w-4 text-muted-foreground" />
              <span className="w-16 text-muted-foreground">Dono:</span>
              <span className="font-medium">
                {members.find((m) => m.userId === contact.assignedTo)?.user
                  ?.fullName || 'Não atribuído'}
              </span>
            </div>

            {/* Email */}
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="w-16 text-muted-foreground">Email:</span>
              <InlineTextField
                value={contact.email}
                onSave={(value) => updateField('email', value)}
                isPending={isPending}
                placeholder="Adicionar email"
                displayClassName="font-medium"
                inputClassName="h-8 w-[200px]"
              />
            </div>

            {/* Phone */}
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="w-16 text-muted-foreground">Telefone:</span>
              <InlineTextField
                value={formatPhone(contact.phone)}
                onSave={(value) => updateField('phone', value)}
                isPending={isPending}
                placeholder="Adicionar telefone"
                displayClassName="font-medium"
                inputClassName="h-8 w-[200px]"
              />
            </div>

            {/* CPF */}
            <div className="flex items-center gap-2 text-sm">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="w-16 text-muted-foreground">CPF:</span>
              <InlineTextField
                value={contact.cpf}
                onSave={(value) => updateField('cpf', value)}
                isPending={isPending}
                placeholder="Adicionar CPF"
                displayClassName="font-medium"
                inputClassName="h-8 w-[200px]"
              />
            </div>
            {/* Switch Decisor */}
            <div className="flex items-center gap-2">
              <Label
                htmlFor="decision-maker"
                className="flex items-center gap-2 pr-2 text-sm text-muted-foreground"
              >
                <AxeIcon className="h-4 w-4 text-muted-foreground" />
                Decisor:
              </Label>
              <Switch
                id="decision-maker"
                checked={contact.isDecisionMaker}
                onCheckedChange={(checked) =>
                  updateField('isDecisionMaker', checked)
                }
                disabled={isPending}
              />
            </div>
          </CardContent>
        </Card>

        {/* Card Empresa */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5" />
              Empresa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InlineSelectField
              value={contact.companyId}
              options={companies.map((c) => ({ value: c.id, label: c.name }))}
              onSave={(value) => updateField('companyId', value)}
              isPending={isPending}
              placeholder="Selecione uma empresa"
              emptyLabel="Nenhuma empresa vinculada"
            />
          </CardContent>
        </Card>
      </div>

      {contact.deals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Negociações Vinculadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {contact.deals.map((deal) => (
                <li key={deal.id} className="text-sm">
                  <Link
                    href={`/pipeline/deal/${deal.id}`}
                    className="hover:text-primary hover:underline"
                  >
                    {deal.title}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Dialog de Transferência */}
      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transferir Contato</DialogTitle>
            <DialogDescription>
              Selecione o novo responsável por este contato.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="new-owner">Novo Responsável</Label>
            <Select onValueChange={setSelectedMemberId}>
              <SelectTrigger id="new-owner" className="mt-2 w-full">
                <SelectValue placeholder="Selecione um membro..." />
              </SelectTrigger>
              <SelectContent>
                {assignableMembers.map((m) => (
                  <SelectItem key={m.id} value={m.userId as string}>
                    {m.user?.fullName} ({m.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsTransferOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleTransfer}
              disabled={!selectedMemberId || isPending}
            >
              Transferir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ContactDetailClient
