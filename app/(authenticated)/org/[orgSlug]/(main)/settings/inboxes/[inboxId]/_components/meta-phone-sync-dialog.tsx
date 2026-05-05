'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import {
  Phone,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  PhoneCall,
} from 'lucide-react'
import { Button } from '@/_components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/_components/ui/dialog'
import { Badge } from '@/_components/ui/badge'
import { Skeleton } from '@/_components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
import { fetchMetaPhoneNumbers } from '@/_actions/inbox/fetch-meta-phone-numbers'
import { updateMetaPhoneNumber } from '@/_actions/inbox/update-meta-phone-number'
import type { WabaPhoneNumberDto } from '@/_lib/meta/types'

interface MetaPhoneSyncDialogProps {
  inboxId: string
  onSuccess: (newPhoneDisplay: string) => void
}

// Mapeia qualityRating para classes de cor do Badge
const qualityVariantMap: Record<
  WabaPhoneNumberDto['qualityRating'],
  { label: string; className: string }
> = {
  GREEN: {
    label: 'Qualidade alta',
    className:
      'border-kronos-green/20 bg-kronos-green/10 text-kronos-green',
  },
  YELLOW: {
    label: 'Qualidade média',
    className:
      'border-yellow-500/20 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  },
  RED: {
    label: 'Qualidade baixa',
    className:
      'border-destructive/20 bg-destructive/10 text-destructive',
  },
  UNKNOWN: {
    label: 'Qualidade desconhecida',
    className: 'border-border/50 bg-muted text-muted-foreground',
  },
}

interface PhoneNumberItemProps {
  phoneNumber: WabaPhoneNumberDto
  onUse: (phoneNumber: WabaPhoneNumberDto) => void
  isUpdating: boolean
  updatingId: string | null
}

const PhoneNumberItem = ({
  phoneNumber,
  onUse,
  isUpdating,
  updatingId,
}: PhoneNumberItemProps) => {
  const quality = qualityVariantMap[phoneNumber.qualityRating]
  const isThisUpdating = isUpdating && updatingId === phoneNumber.id

  // Numero atual desta inbox
  if (phoneNumber.isCurrentInbox) {
    return (
      <div className="flex items-center justify-between rounded-md border border-border/50 bg-background/70 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-kronos-green/10">
            <Phone className="h-4 w-4 text-kronos-green" />
          </div>
          <div>
            <p className="text-sm font-medium">{phoneNumber.verifiedName}</p>
            <p className="text-xs text-muted-foreground">
              {phoneNumber.displayPhoneNumber}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={quality.className}>
            {quality.label}
          </Badge>
          <Badge
            variant="outline"
            className="border-kronos-green/20 bg-kronos-green/10 text-kronos-green"
          >
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Número atual
          </Badge>
        </div>
      </div>
    )
  }

  // Numero em uso por outra inbox — botao desabilitado com tooltip explicativo
  if (phoneNumber.inUseByInboxId) {
    return (
      <div className="flex items-center justify-between rounded-md border border-border/50 bg-background/50 p-4 opacity-70">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
            <Phone className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">{phoneNumber.verifiedName}</p>
            <p className="text-xs text-muted-foreground">
              {phoneNumber.displayPhoneNumber}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={quality.className}>
            {quality.label}
          </Badge>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Badge variant="secondary">
                    Em uso em &ldquo;{phoneNumber.inUseByInboxName}&rdquo;
                  </Badge>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  Este número já está vinculado à caixa de entrada &ldquo;
                  {phoneNumber.inUseByInboxName}&rdquo;. Desvincule-o de lá
                  antes de usar aqui.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    )
  }

  // Numero disponivel — exibe botao de acao
  return (
    <div className="flex items-center justify-between rounded-md border border-border/50 bg-background/70 p-4 transition-colors hover:bg-background">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
          <Phone className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium">{phoneNumber.verifiedName}</p>
          <p className="text-xs text-muted-foreground">
            {phoneNumber.displayPhoneNumber}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={quality.className}>
          {quality.label}
        </Badge>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onUse(phoneNumber)}
          disabled={isUpdating}
        >
          {isThisUpdating ? (
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          ) : (
            <PhoneCall className="mr-2 h-3.5 w-3.5" />
          )}
          Usar este número
        </Button>
      </div>
    </div>
  )
}

const LoadingSkeleton = () => (
  <div className="space-y-3">
    {[1, 2, 3].map((index) => (
      <div
        key={index}
        className="flex items-center justify-between rounded-md border border-border/50 p-4"
      >
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-8 w-28" />
      </div>
    ))}
  </div>
)

interface MetaPhoneSyncDialogContentProps {
  inboxId: string
  onSuccess: (newPhoneDisplay: string) => void
  onClose: () => void
}

const MetaPhoneSyncDialogContent = ({
  inboxId,
  onSuccess,
  onClose,
}: MetaPhoneSyncDialogContentProps) => {
  const [phoneNumbers, setPhoneNumbers] = useState<WabaPhoneNumberDto[]>([])
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [hasLoaded, setHasLoaded] = useState(false)

  const { execute: executeFetch, isPending: isFetching, hasErrored, reset } = useAction(
    fetchMetaPhoneNumbers,
    {
      onSuccess: ({ data }) => {
        setPhoneNumbers(data?.phoneNumbers ?? [])
        setHasLoaded(true)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao buscar números do WABA.')
      },
    },
  )

  const { execute: executeUpdate, isPending: isUpdating } = useAction(
    updateMetaPhoneNumber,
    {
      onSuccess: ({ data }) => {
        const phoneDisplay = data?.phoneDisplay ?? ''
        toast.success('Número atualizado com sucesso!')
        setUpdatingId(null)
        onSuccess(phoneDisplay)
        onClose()
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao trocar o número.')
        setUpdatingId(null)
      },
    },
  )

  // Dispara o fetch na primeira vez que o conteudo e montado (open=true)
  if (!hasLoaded && !isFetching && !hasErrored) {
    executeFetch({ inboxId })
  }

  const handleRetry = () => {
    reset()
    setHasLoaded(false)
    executeFetch({ inboxId })
  }

  const handleUseNumber = (phoneNumber: WabaPhoneNumberDto) => {
    setUpdatingId(phoneNumber.id)
    executeUpdate({
      inboxId,
      phoneNumberId: phoneNumber.id,
    })
  }

  if (isFetching) {
    return <LoadingSkeleton />
  }

  if (hasErrored) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">Não foi possível buscar os números</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Verifique se o token de acesso ainda é válido.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRetry}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Tentar novamente
        </Button>
      </div>
    )
  }

  if (hasLoaded && phoneNumbers.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Phone className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-center text-sm text-muted-foreground">
          Nenhum número de telefone encontrado neste WABA.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {phoneNumbers.map((phoneNumber) => (
        <PhoneNumberItem
          key={phoneNumber.id}
          phoneNumber={phoneNumber}
          onUse={handleUseNumber}
          isUpdating={isUpdating}
          updatingId={updatingId}
        />
      ))}
    </div>
  )
}

const MetaPhoneSyncDialog = ({ inboxId, onSuccess }: MetaPhoneSyncDialogProps) => {
  const [open, setOpen] = useState(false)

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleOpenChange(true)}
      >
        <RefreshCw className="mr-2 h-4 w-4" />
        Buscar números
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Números do WABA
            </DialogTitle>
            <DialogDescription>
              Abaixo estão todos os números vinculados à sua conta WhatsApp
              Business. Selecione o número correto para esta caixa de entrada.
            </DialogDescription>
          </DialogHeader>

          {open && (
            <MetaPhoneSyncDialogContent
              inboxId={inboxId}
              onSuccess={onSuccess}
              onClose={() => setOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

export default MetaPhoneSyncDialog
