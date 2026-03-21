'use client'

import { useState } from 'react'
import { Calendar, RefreshCw, Loader2, Clock } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import { Separator } from '@/_components/ui/separator'
import type { UserIntegrationDto } from '@/_data-access/integration/types'
import { triggerFullSync } from '@/_actions/integration/trigger-full-sync'
import GoogleConnectButton from './google-connect-button'
import DisconnectDialog from './disconnect-dialog'
import SyncStatusBadge from './sync-status-badge'

interface IntegrationCardProps {
  integration: UserIntegrationDto | null
  orgSlug: string
  enabled: boolean
}

const GoogleCalendarIcon = () => (
  <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-white shadow-sm">
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className="h-6 w-6"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  </div>
)

const IntegrationCard = ({ integration, orgSlug, enabled }: IntegrationCardProps) => {
  const [disconnectOpen, setDisconnectOpen] = useState(false)

  const { execute: executeSync, isPending: isSyncing } = useAction(
    triggerFullSync,
    {
      onSuccess: () => {
        toast.success('Sincronização iniciada!')
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao iniciar sincronização.')
      },
    },
  )

  // Estado "Em breve" — integração ainda não configurada no servidor
  if (!enabled) {
    return (
      <Card className="flex flex-col opacity-75">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GoogleCalendarIcon />
              <div>
                <CardTitle className="text-base">Google Calendar</CardTitle>
                <CardDescription className="text-sm">
                  Sincronize seus agendamentos automaticamente.
                </CardDescription>
              </div>
            </div>
            <Badge
              variant="outline"
              className="border-kronos-purple/20 bg-kronos-purple/10 text-kronos-purple"
            >
              <Clock className="mr-1 h-3 w-3" />
              Em breve
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>
              Em breve você poderá conectar sua conta Google para sincronizar eventos com o CRM.
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const isDisconnected = !integration || integration.status === 'REVOKED'
  const isExpired = integration?.status === 'EXPIRED'
  const isActive = integration?.status === 'ACTIVE'

  if (isDisconnected) {
    return (
      <Card className="flex flex-col">
        <CardHeader>
          <div className="flex items-center gap-3">
            <GoogleCalendarIcon />
            <div>
              <CardTitle className="text-base">Google Calendar</CardTitle>
              <CardDescription className="text-sm">
                Sincronize seus agendamentos automaticamente.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>
              Conecte sua conta Google para sincronizar eventos com o CRM.
            </span>
          </div>
        </CardContent>
        <Separator />
        <CardFooter className="pt-4">
          <GoogleConnectButton orgSlug={orgSlug} />
        </CardFooter>
      </Card>
    )
  }

  if (isExpired) {
    return (
      <Card className="flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GoogleCalendarIcon />
              <div>
                <CardTitle className="text-base">Google Calendar</CardTitle>
                {integration.providerAccountId && (
                  <CardDescription className="text-sm">
                    {integration.providerAccountId}
                  </CardDescription>
                )}
              </div>
            </div>
            <Badge
              variant="outline"
              className="border-yellow-500/20 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
            >
              Expirado
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex-1">
          <p className="text-sm text-muted-foreground">
            Sua conexão expirou. Reconecte para continuar sincronizando.
          </p>
        </CardContent>
        <Separator />
        <CardFooter className="pt-4">
          <GoogleConnectButton orgSlug={orgSlug} label="Reconectar" />
        </CardFooter>
      </Card>
    )
  }

  if (isActive) {
    return (
      <>
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <GoogleCalendarIcon />
                <div>
                  <CardTitle className="text-base">Google Calendar</CardTitle>
                  {integration.providerAccountId && (
                    <CardDescription className="text-sm">
                      {integration.providerAccountId}
                    </CardDescription>
                  )}
                </div>
              </div>
              <Badge
                variant="outline"
                className="border-kronos-green/20 bg-kronos-green/10 text-kronos-green"
              >
                Conectado
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            <SyncStatusBadge
              lastSyncAt={integration.lastSyncAt}
              syncError={integration.syncError}
            />
          </CardContent>
          <Separator />
          <CardFooter className="flex gap-2 pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => executeSync({ integrationId: integration.id })}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sincronizar Agora
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setDisconnectOpen(true)}
            >
              Desconectar
            </Button>
          </CardFooter>
        </Card>

        <DisconnectDialog
          integrationId={integration.id}
          open={disconnectOpen}
          onOpenChange={setDisconnectOpen}
        />
      </>
    )
  }

  return null
}

export default IntegrationCard
