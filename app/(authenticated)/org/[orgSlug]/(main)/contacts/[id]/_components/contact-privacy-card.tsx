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
  Trash2,
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { Badge } from '@/_components/ui/badge'
import { Switch } from '@/_components/ui/switch'
import { Label } from '@/_components/ui/label'
import { Button } from '@/_components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/_components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/_components/ui/alert-dialog'

import type { ContactPrivacyDto } from '@/_data-access/privacy/get-contact-privacy'
import { updateContactPrivacy } from '@/_actions/contact/update-contact-privacy'
import { anonymizeContact } from '@/_actions/privacy/anonymize-contact'
import { isElevated } from '@/_lib/rbac/permissions'
import {
  LEGAL_BASIS_CONFIG,
  LEGAL_BASIS_OPTIONS,
  LEGAL_BASIS_SOURCE_LABELS,
  CONSENT_EVENT_TYPE_LABELS,
} from '@/_lib/privacy/consent-labels'
import type { MemberRole, LegalBasis, ConsentEventType } from '@prisma/client'

interface ContactPrivacyCardProps {
  privacy: ContactPrivacyDto | null
  contactId: string
  userRole: MemberRole
  anonymizedAt?: Date | null
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
  anonymizedAt,
}: ContactPrivacyCardProps) => {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [createBasis, setCreateBasis] = useState<LegalBasis | null>(null)
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

  const { execute: executeAnonymize, isPending: isAnonymizing } = useAction(anonymizeContact, {
    onSuccess: () => {
      toast.success('Contato anonimizado com sucesso.', { position: 'bottom-right' })
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao anonimizar contato.', { position: 'bottom-right' })
    },
  })

  const handleCcpaToggle = (checked: boolean) => {
    if (!privacy) return
    execute({ contactId, legalBasis: privacy.legalBasis, ccpaSaleOptOut: checked })
  }

  const handleChangeLegalBasis = (value: string) => {
    execute({ contactId, legalBasis: value as LegalBasis })
  }

  const handleCreatePrivacy = () => {
    if (!createBasis) return
    execute({ contactId, legalBasis: createBasis })
  }

  // Estado: contato já anonimizado
  if (anonymizedAt) {
    return (
      <Card className="border-border/50 bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <ShieldCheck className="h-4 w-4" />
            Privacidade & Consentimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Badge variant="outline" className="border-zinc-500/30 bg-zinc-500/10 text-zinc-400 text-xs">
            Contato anonimizado em {format(anonymizedAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </Badge>
        </CardContent>
      </Card>
    )
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
            <div className="space-y-2">
              <Select
                value={createBasis ?? ''}
                onValueChange={(value) => setCreateBasis((value || null) as LegalBasis | null)}
              >
                <SelectTrigger className="h-auto min-h-9 py-2">
                  <SelectValue placeholder="Selecione a base legal..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="" textValue="Não definido">
                    <span className="text-xs text-muted-foreground">Não definido</span>
                  </SelectItem>
                  {LEGAL_BASIS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value} textValue={option.label}>
                      <span className="flex flex-col items-start gap-2">
                        <span className="font-medium">{option.label}</span>
                        <span className="text-xs text-muted-foreground">{option.description}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreatePrivacy}
                disabled={isPending || !createBasis}
              >
                <Plus className="mr-2 h-3.5 w-3.5" />
                Criar registro de privacidade
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const legalBasisCfg = LEGAL_BASIS_CONFIG[privacy.legalBasis]

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
          {/* Base legal atual — editável para ADMIN/OWNER */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Base legal</span>
            {canEdit ? (
              <Select
                value={privacy.legalBasis}
                onValueChange={handleChangeLegalBasis}
                disabled={isPending}
              >
                <SelectTrigger className="h-auto min-h-9 w-auto border-0 bg-background px-2 py-2 text-xs font-medium shadow-none focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEGAL_BASIS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value} textValue={option.label}>
                      <span className="flex flex-col items-start gap-2">
                        <span className="font-medium">{option.label}</span>
                        <span className="text-xs text-muted-foreground">{option.description}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Badge
                variant="outline"
                className={`h-6 px-2 text-xs font-medium ${legalBasisCfg.badgeClassName}`}
              >
                {legalBasisCfg.label}
              </Badge>
            )}
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

          {/* CCPA — exibido apenas quando ativo ou ADMIN quer ativar */}
          {privacy.ccpaSaleOptOut ? (
            <div className="flex items-center justify-between border-t pt-3">
              <Label
                htmlFor="ccpa-opt-out"
                className="flex flex-col gap-0.5 cursor-pointer"
              >
                <span className="text-sm font-medium">Opt-out de venda de dados (CCPA)</span>
                <span className="text-xs text-muted-foreground">
                  {privacy.ccpaKnownAt
                    ? `Registrado em ${format(privacy.ccpaKnownAt, 'dd/MM/yyyy', { locale: ptBR })}`
                    : 'Ativo'}
                </span>
              </Label>
              {canEdit ? (
                <Switch
                  id="ccpa-opt-out"
                  checked={privacy.ccpaSaleOptOut}
                  onCheckedChange={handleCcpaToggle}
                  disabled={isPending}
                />
              ) : (
                <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs">
                  Ativo
                </Badge>
              )}
            </div>
          ) : canEdit ? (
            <div className="border-t pt-3">
              <button
                type="button"
                onClick={() => handleCcpaToggle(true)}
                disabled={isPending}
                className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50"
              >
                Registrar opt-out CCPA (EUA)
              </button>
            </div>
          ) : null}

          {/* Anonimizar — apenas ADMIN/OWNER */}
          {canEdit && (
            <div className="border-t pt-3">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={isAnonymizing}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Anonimizar contato
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Anonimizar contato?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação apagará permanentemente nome, e-mail, telefone e campos personalizados deste contato. O histórico de consentimento e negociações são preservados para fins de compliance. Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => executeAnonymize({ contactId })}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Anonimizar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
                        {CONSENT_EVENT_TYPE_LABELS[event.eventType]}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {format(event.createdAt, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="rounded bg-muted px-1.5 py-0.5">
                        {LEGAL_BASIS_CONFIG[event.legalBasis].label}
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
