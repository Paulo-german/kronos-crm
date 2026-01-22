'use client'

import { User, Mail, Phone, Briefcase, Copy } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { Button } from '@/_components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
import type { DealDetailsDto } from '@/_data-access/deal/get-deal-details'
import { formatPhone } from '@/_helpers/format-phone'

interface ContactWidgetProps {
  deal: DealDetailsDto
}

const ContactWidget = ({ deal }: ContactWidgetProps) => {
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

  // Se não houver contato vinculado
  if (!deal.contactId || !deal.contactName) {
    return (
      <Card className="border-muted/40 bg-gradient-to-br from-background to-muted/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Contato</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="rounded-full bg-muted p-4">
              <User className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Nenhum contato vinculado
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-muted/40 bg-gradient-to-br from-background to-muted/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Contato</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Avatar e Nome (Bloco Clicável) */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href={`/contacts/${deal.contactId}`}
                className="-mx-2 flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-base font-bold text-white shadow-md">
                  {getInitials(deal.contactName)}
                </div>

                <div className="flex-1">
                  <p className="text-base font-semibold text-primary">
                    {deal.contactName}
                  </p>
                  {deal.contactRole && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Briefcase className="h-3 w-3" />
                      {deal.contactRole}
                    </p>
                  )}
                </div>
              </Link>
            </TooltipTrigger>
            <TooltipContent>
              <p>Ir para página do contato</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Lista de Dados */}
        <div className="space-y-2 border-t pt-3">
          {/* Email */}
          {deal.contactEmail && (
            <div className="group flex items-center justify-between gap-2 rounded-md border bg-muted/30 p-2 transition-colors hover:bg-muted/50">
              <div className="flex items-center gap-2 overflow-hidden">
                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate text-sm">{deal.contactEmail}</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 shrink-0 p-0"
                onClick={() => copyToClipboard(deal.contactEmail!, 'Email')}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {/* Telefone */}
          {deal.contactPhone && (
            <div className="group flex items-center justify-between gap-2 rounded-md border bg-muted/30 p-2 transition-colors hover:bg-muted/50">
              <div className="flex items-center gap-2 overflow-hidden">
                <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate text-sm">
                  {formatPhone(deal.contactPhone)}
                </span>
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 shrink-0 p-0"
                  onClick={() =>
                    copyToClipboard(deal.contactPhone!, 'Telefone')
                  }
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 shrink-0 p-0"
                  asChild
                >
                  <a
                    href={`https://wa.me/${formatPhoneForWhatsApp(deal.contactPhone)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <svg
                      className="h-4 w-4 text-kronos-green"
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
      </CardContent>
    </Card>
  )
}

export default ContactWidget
