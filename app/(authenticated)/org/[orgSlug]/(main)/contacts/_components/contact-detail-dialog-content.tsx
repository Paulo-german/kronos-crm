'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  Building2,
  Mail,
  Phone,
  User2,
  CreditCard,
  Briefcase,
  AxeIcon,
  UserCog,
  CircleIcon,
} from 'lucide-react'

import { Button } from '@/_components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { Badge } from '@/_components/ui/badge'
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

import type { ContactDto } from '@/_data-access/contact/get-contacts'
import type { CompanyDto } from '@/_data-access/company/get-companies'
import { InlineTextField } from '@/_components/form-controls/inline-text-field'
import { InlineSelectField } from '@/_components/form-controls/inline-select-field'
import { useContactFieldUpdate } from '../_hooks/use-contact-field-update'
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

interface ContactDetailDialogContentProps {
  contact: ContactDto
  companies: CompanyDto[]
  members: MemberDto[]
  currentUserId: string
  userRole: MemberRole
}

const ContactDetailDialogContent = ({
  contact,
  companies,
  members,
  currentUserId,
  userRole,
}: ContactDetailDialogContentProps) => {
  const { updateField, isPending } = useContactFieldUpdate({
    contactId: contact.id,
  })

  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState<string | undefined>(
    undefined,
  )

  const canTransfer =
    userRole === 'ADMIN' ||
    userRole === 'OWNER' ||
    contact.assignedTo === currentUserId

  const handleTransfer = () => {
    if (selectedMemberId) {
      updateField('assignedTo', selectedMemberId)
      setIsTransferOpen(false)
    }
  }

  const assignableMembers = members.filter(
    (member) => member.user?.fullName,
  )

  return (
    <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="sr-only">
          Detalhes do contato: {contact.name}
        </DialogTitle>
      </DialogHeader>

      {/* Header: Nome + Badges + Ações (padrão deal-detail) */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div>
            <InlineTextField
              value={contact.name}
              onSave={(value) => updateField('name', value)}
              isPending={isPending}
              displayClassName="text-2xl font-bold"
              inputClassName="h-9 min-w-[300px]"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={`h-6 gap-1.5 px-2 text-xs font-semibold transition-colors ${
                  contact.isDecisionMaker
                    ? 'bg-kronos-green/10 text-kronos-green border-kronos-green/20'
                    : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                }`}
              >
                <CircleIcon className="h-1.5 w-1.5 fill-current" />
                {contact.isDecisionMaker ? 'Decisor' : 'Não Decisor'}
              </Badge>
            </div>
          </div>
          {canTransfer && userRole !== 'MEMBER' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsTransferOpen(true)}
              disabled={isPending}
            >
              <UserCog className="mr-2 h-4 w-4" />
              Transferir
            </Button>
          )}
        </div>
      </div>

      {/* Grid: Info + Empresa (padrão tab-summary 2 colunas) */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Card Informações de Contato */}
        <Card className="border-border/50 bg-secondary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Informações de Contato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Email */}
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                Email
              </span>
              <InlineTextField
                value={contact.email}
                onSave={(value) => updateField('email', value)}
                isPending={isPending}
                placeholder="Adicionar"
                displayClassName="font-medium"
                inputClassName="h-7 w-[180px]"
              />
            </div>

            {/* Cargo */}
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <User2 className="h-3.5 w-3.5" />
                Cargo
              </span>
              <InlineTextField
                value={contact.role}
                onSave={(value) => updateField('role', value)}
                isPending={isPending}
                placeholder="Adicionar"
                displayClassName="font-medium"
                inputClassName="h-7 w-[180px]"
              />
            </div>

            {/* Telefone */}
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                Telefone
              </span>
              <InlineTextField
                value={formatPhone(contact.phone)}
                onSave={(value) => updateField('phone', value)}
                isPending={isPending}
                placeholder="Adicionar"
                displayClassName="font-medium"
                inputClassName="h-7 w-[180px]"
              />
            </div>

            {/* CPF */}
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <CreditCard className="h-3.5 w-3.5" />
                CPF
              </span>
              <InlineTextField
                value={contact.cpf}
                onSave={(value) => updateField('cpf', value)}
                isPending={isPending}
                placeholder="Adicionar"
                displayClassName="font-medium"
                inputClassName="h-7 w-[180px]"
              />
            </div>

            {/* Switch Decisor */}
            <div className="flex items-center justify-between border-t pt-3 text-sm">
              <Label
                htmlFor="decision-maker-dialog"
                className="flex items-center gap-1.5 text-muted-foreground"
              >
                <AxeIcon className="h-3.5 w-3.5" />
                Decisor
              </Label>
              <Switch
                id="decision-maker-dialog"
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
        <Card className="border-border/50 bg-secondary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Building2 className="h-4 w-4" />
              Empresa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InlineSelectField
              value={contact.companyId}
              options={companies.map((company) => ({
                value: company.id,
                label: company.name,
              }))}
              onSave={(value) => updateField('companyId', value)}
              isPending={isPending}
              placeholder="Selecione uma empresa"
              emptyLabel="Nenhuma empresa vinculada"
            />
          </CardContent>
        </Card>
      </div>

      {/* Deals vinculados */}
      {contact.deals?.length > 0 && (
        <Card className="border-border/50 bg-secondary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Briefcase className="h-4 w-4" />
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

      {/* Responsável (padrão deal-detail: rounded-lg border bg-card) */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <UserCog className="h-4 w-4" />
          <span>Responsável pelo Contato:</span>
          <span className="font-medium text-foreground">
            {members.find(
              (member) => member.userId === contact.assignedTo,
            )?.user?.fullName || 'Não atribuído'}
          </span>
        </div>
      </div>

      {/* Dialog de Transferência (nested) */}
      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transferir Contato</DialogTitle>
            <DialogDescription>
              Selecione o novo responsável por este contato.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="new-owner-dialog">Novo Responsável</Label>
            <Select onValueChange={setSelectedMemberId}>
              <SelectTrigger id="new-owner-dialog" className="mt-2 w-full">
                <SelectValue placeholder="Selecione um membro..." />
              </SelectTrigger>
              <SelectContent>
                {assignableMembers.map((member) => (
                  <SelectItem
                    key={member.id}
                    value={member.userId as string}
                  >
                    {member.user?.fullName} ({member.email})
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
    </DialogContent>
  )
}

export default ContactDetailDialogContent
