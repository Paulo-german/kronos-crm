'use client'

import Link from 'next/link'
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  User2,
  CreditCard,
  Briefcase,
  AxeIcon,
} from 'lucide-react'

import { Button } from '@/_components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { Switch } from '@/_components/ui/switch'
import { Label } from '@/_components/ui/label'

import type { ContactDetailDto } from '@/_data-access/contact/get-contact-by-id'
import type { CompanyDto } from '@/_data-access/company/get-companies'
import { InlineTextField } from '@/_components/inline-text-field'
import { InlineSelectField } from '@/_components/inline-select-field'
import { useContactFieldUpdate } from '@/_hooks/use-contact-field-update'

interface ContactDetailClientProps {
  contact: ContactDetailDto
  companies: CompanyDto[]
}

const ContactDetailClient = ({
  contact,
  companies,
}: ContactDetailClientProps) => {
  // Hook customizado para atualização de campos
  const { updateField, isPending } = useContactFieldUpdate({
    contactId: contact.id,
  })

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/contacts">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Link>
      </Button>

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
                value={contact.phone}
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
    </div>
  )
}

export default ContactDetailClient
