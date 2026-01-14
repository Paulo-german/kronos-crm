import { createClient } from '@/_lib/supabase/server'
import { getContactById } from '@/_data-access/contact/get-contact-by-id'
import { notFound } from 'next/navigation'
import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { ArrowLeft, Building2, Mail, Phone, User2 } from 'lucide-react'
import Link from 'next/link'

interface ContactDetailsPageProps {
  params: Promise<{ id: string }>
}

const ContactDetailsPage = async ({ params }: ContactDetailsPageProps) => {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const contact = await getContactById(id, user.id)

  if (!contact) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/contacts">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Link>
      </Button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{contact.name}</h1>
          <p className="text-muted-foreground">
            {contact.role || 'Sem cargo definido'}
          </p>
        </div>
        <div className="flex gap-2">
          {contact.isDecisionMaker && <Badge>Decisor</Badge>}
          {!contact.company && <Badge variant="outline">B2C</Badge>}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User2 className="h-5 w-5" />
              Informações de Contato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {contact.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{contact.email}</span>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{contact.phone}</span>
              </div>
            )}
            {contact.cpf && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">CPF:</span>
                <span>{contact.cpf}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {contact.company && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5" />
                Empresa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{contact.company.name}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {contact.deals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Negociações Vinculadas</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {contact.deals.map((deal) => (
                <li key={deal.id} className="text-sm">
                  {deal.title}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default ContactDetailsPage
