'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import {
  ShieldCheck,
  Clock,
  User,
  FileText,
  CheckCircle2,
  XCircle,
  RefreshCw,
  TimerOff,
  Plus,
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { Badge } from '@/_components/ui/badge'
import { Switch } from '@/_components/ui/switch'
import { Label } from '@/_components/ui/label'
import { Button } from '@/_components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/_components/ui/dialog'

import type { ContactPrivacyDto } from '@/_data-access/privacy/get-contact-privacy'
import { updateContactPrivacy } from '@/_actions/contact/update-contact-privacy'
import { isElevated } from '@/_lib/rbac'
import type { MemberRole, LegalBasis, ConsentEventType } from '@prisma/client'

interface ContactPrivacyCardProps {
  privacy: ContactPrivacyDto | null
  contactId: string
  userRole: MemberRole
}

// Labels PT-BR das bases legais
const LEGAL_BASIS_LABELS: Record<LegalBasis, string> = {
  CONSENT: 'Consentimento',
  LEGITIMATE_INTEREST: 'Legítimo Interesse',
  CONTRACT: 'Contrato',
  LEGAL_OBLIGATION: 'Obrigação Legal',
  VITAL_INTERESTS: 'Interesses Vitais',
  PUBLIC_TASK: 'Tarefa de Interesse Público',
}

// Labels PT-BR das fontes de base legal
const LEGAL_BASIS_SOURCE_LABELS: Record<string, string> = {
  MANUAL_CREATION: 'Criação manual',
  IMPORT: 'Importação',
  EMBED_FORM: 'Formulário de captura',
  WHATSAPP_INBOUND: 'WhatsApp inbound',
  API: 'API / integração',
  ADMIN_UPDATE: 'Atualização administrativa',
}

// Labels PT-BR dos tipos de evento
const EVENT_TYPE_LABELS: Record<ConsentEventType, string> = {
  GRANTED: 'Consentimento concedido',
  WITHDRAWN: 'Consentimento revogado',
  UPDATED: 'Base legal atualizada',
  EXPIRED: 'Consentimento expirado',
}

interface BadgeConfig {
  className: string
}

const LEGAL_BASIS_BADGE_CONFIG: Record<LegalBasis, BadgeConfig> = {
  CONSENT: { className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' },
  LEGITIMATE_INTEREST: { className: 'border-blue-500/30 bg-blue-500/10 text-blue-400' },
  CONTRACT: { className: 'border-violet-500/30 bg-violet-500/10 text-violet-400' },
  LEGAL_OBLIGATION: { className: 'border-zinc-500/30 bg-zinc-500/10 text-zinc-400' },
  VITAL_INTERESTS: { className: 'border-zinc-500/30 bg-zinc-500/10 text-zinc-400' },
  PUBLIC_TASK: { className: 'border-zinc-500/30 bg-zinc-500/10 text-zinc-400' },
}

interface EventTypeIconProps {
  eventType: ConsentEventType
}

const EventTypeIcon = ({ eventType }: EventTypeIconProps) => {
  if (eventType === 'GRANTED') {
    return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
  }
  if (eventType === 'WITHDRAWN') {
    return <XCircle className="h-3.5 w-3.5 text-red-400" />
  }
  if (eventType === 'UPDATED') {
    return <RefreshCw className="h-3.5 w-3.5 text-blue-400" />
  }
  return <TimerOff className="h-3.5 w-3.5 text-zinc-400" />
}

const ContactPrivacyCard = ({
  privacy,
  contactId,
  userRole,
}: ContactPrivacyCardProps) => {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const canEdit = isElevated(userRole)
  const router = useRouter()

  const { execute, isPending } = useAction(updateContactPrivacy, {
    onSuccess: () => {
      toast.success('Configuração de privacidade atualizada.', { position: 'bottom-right' })
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao atualizar privacidade.', { position: 'bottom-right' })
    },
  })

  const handleCcpaToggle = (checked: boolean) => {
    if (!privacy) return
    execute({ contactId, legalBasis: privacy.legalBasis, ccpaSaleOptOut: checked })
  }

  const handleCreatePrivacy = () => {
    execute({ contactId, legalBasis: 'LEGITIMATE_INTEREST' })
  }

  // Estado sem registro de privacidade
  if (!privacy) {
    return (
      <Card className="border-border/50 bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <ShieldCheck className="h-4 w-4" />
            Privacidade & Consentimento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Sem registro de privacidade para este contato.
          </p>
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreatePrivacy}
              disabled={isPending}
            >
              <Plus className="mr-2 h-3.5 w-3.5" />
              Criar registro de privacidade
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  const badgeConfig = LEGAL_BASIS_BADGE_CONFIG[privacy.legalBasis]

  return (
    <>
      <Card className="border-border/50 bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <ShieldCheck className="h-4 w-4" />
              Privacidade & Consentimento
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsHistoryOpen(true)}
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              Ver histórico
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Base legal atual */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Base legal</span>
            <Badge
              variant="outline"
              className={`h-6 px-2 text-xs font-medium ${badgeConfig.className}`}
            >
              {LEGAL_BASIS_LABELS[privacy.legalBasis]}
            </Badge>
          </div>

          {/* Fonte */}
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              Origem
            </span>
            <span className="font-medium">
              {LEGAL_BASIS_SOURCE_LABELS[privacy.legalBasisSource] ?? privacy.legalBasisSource}
            </span>
          </div>

          {/* Data de consentimento — só exibe quando base legal = CONSENT */}
          {privacy.consentedAt && (
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Consentimento em
              </span>
              <span className="font-medium">
                {format(privacy.consentedAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            </div>
          )}

          {/* Versão do consentimento (quando disponível) */}
          {privacy.consentVersion && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Versão</span>
              <span className="font-mono text-xs">{privacy.consentVersion}</span>
            </div>
          )}

          {/* Toggle CCPA — apenas ADMIN/OWNER */}
          {canEdit && (
            <div className="flex items-center justify-between border-t pt-3">
              <Label
                htmlFor="ccpa-opt-out"
                className="flex flex-col gap-0.5 cursor-pointer"
              >
                <span className="text-sm font-medium">Opt-out de venda de dados (CCPA)</span>
                <span className="text-xs text-muted-foreground">
                  {privacy.ccpaKnownAt
                    ? `Registrado em ${format(privacy.ccpaKnownAt, 'dd/MM/yyyy', { locale: ptBR })}`
                    : 'Não registrado'}
                </span>
              </Label>
              <Switch
                id="ccpa-opt-out"
                checked={privacy.ccpaSaleOptOut}
                onCheckedChange={handleCcpaToggle}
                disabled={isPending}
              />
            </div>
          )}

          {/* Leitura somente para MEMBER */}
          {!canEdit && privacy.ccpaSaleOptOut && (
            <div className="border-t pt-3">
              <Badge
                variant="outline"
                className="border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs"
              >
                Opt-out CCPA ativo
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de histórico de eventos */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Histórico de Consentimento
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[420px] space-y-1 overflow-y-auto pr-1">
            {privacy.recentEvents.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhum evento registrado.
              </p>
            ) : (
              privacy.recentEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex gap-3 rounded-lg border border-border/40 p-3"
                >
                  <div className="mt-0.5 shrink-0">
                    <EventTypeIcon eventType={event.eventType} />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">
                        {EVENT_TYPE_LABELS[event.eventType]}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {format(event.createdAt, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="rounded bg-muted px-1.5 py-0.5">
                        {LEGAL_BASIS_LABELS[event.legalBasis]}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>{event.performedBy ?? 'Sistema'}</span>
                    </div>

                    {event.notes && (
                      <p className="text-xs text-muted-foreground italic">
                        {event.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export { ContactPrivacyCard }
