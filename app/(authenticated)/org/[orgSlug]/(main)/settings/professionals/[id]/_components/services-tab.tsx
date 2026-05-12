'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Check, ChevronsUpDown, Loader2, Trash2, Tag } from 'lucide-react'

import { Button } from '@/_components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { Badge } from '@/_components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/_components/ui/alert-dialog'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/_components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/_components/ui/popover'
import { cn } from '@/_lib/utils'

import { assignServiceToProfessional } from '@/_actions/professional-service/assign-service-to-professional'
import { removeServiceFromProfessional } from '@/_actions/professional-service/remove-service-from-professional'
import type { ProfessionalDetailDto } from '@/_data-access/professional/get-professional-by-id'
import type { ServiceDto } from '@/_data-access/service/get-services'

const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes}min`
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  return remaining > 0 ? `${hours}h ${remaining}min` : `${hours}h`
}

const formatCurrency = (price: string): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(parseFloat(price))
}

interface ServicesTabProps {
  professional: ProfessionalDetailDto
  allServices: ServiceDto[]
}

interface RemoveConfirmState {
  isOpen: boolean
  serviceId: string
  serviceName: string
}

const ServicesTab = ({ professional, allServices }: ServicesTabProps) => {
  const [comboboxOpen, setComboboxOpen] = useState(false)
  const [removeConfirm, setRemoveConfirm] = useState<RemoveConfirmState>({
    isOpen: false,
    serviceId: '',
    serviceName: '',
  })

  const assignedServiceIds = new Set(
    professional.professionalServices.map((ps) => ps.serviceId),
  )

  const availableServices = allServices.filter(
    (service) => service.isActive && !assignedServiceIds.has(service.id),
  )

  const { execute: executeAssign, isPending: isAssigning } = useAction(
    assignServiceToProfessional,
    {
      onSuccess: () => {
        toast.success('Serviço vinculado com sucesso!')
        setComboboxOpen(false)
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao vincular serviço.')
      },
    },
  )

  const { execute: executeRemove, isPending: isRemoving } = useAction(
    removeServiceFromProfessional,
    {
      onSuccess: () => {
        toast.success('Serviço desvinculado com sucesso!')
        setRemoveConfirm({ isOpen: false, serviceId: '', serviceName: '' })
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao desvincular serviço.')
      },
    },
  )

  const handleSelectService = (serviceId: string) => {
    executeAssign({
      professionalId: professional.id,
      serviceId,
    })
  }

  const handleRemoveClick = (serviceId: string, serviceName: string) => {
    setRemoveConfirm({ isOpen: true, serviceId, serviceName })
  }

  const handleConfirmRemove = () => {
    executeRemove({
      professionalId: professional.id,
      serviceId: removeConfirm.serviceId,
    })
  }

  return (
    <>
      <div className="space-y-4">
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Serviços Vinculados
              </CardTitle>
              <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={availableServices.length === 0 || isAssigning}
                    aria-expanded={comboboxOpen}
                  >
                    {isAssigning ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ChevronsUpDown className="mr-2 h-4 w-4" />
                    )}
                    Adicionar Serviço
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" align="end">
                  <Command>
                    <CommandInput placeholder="Buscar serviço..." />
                    <CommandList>
                      <CommandEmpty>Nenhum serviço disponível.</CommandEmpty>
                      <CommandGroup>
                        {availableServices.map((service) => (
                          <CommandItem
                            key={service.id}
                            value={`${service.name} ${service.categoryName}`}
                            onSelect={() => handleSelectService(service.id)}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                assignedServiceIds.has(service.id)
                                  ? 'opacity-100'
                                  : 'opacity-0',
                              )}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">{service.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {service.categoryName} · {formatDuration(service.duration)}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </CardHeader>
          <CardContent>
            {professional.professionalServices.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/50 py-10 text-center">
                <Tag className="mb-3 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm font-medium text-muted-foreground">
                  Nenhum serviço vinculado
                </p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  Use o botão &quot;Adicionar Serviço&quot; para vincular serviços a este profissional.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {professional.professionalServices.map(({ id, serviceId, service }) => (
                  <div
                    key={id}
                    className="flex items-center justify-between rounded-lg border border-border/50 bg-card/50 p-4"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{service.name}</span>
                        {service.category ? (
                          <Badge variant="outline" className="text-xs">
                            {service.category.name}
                          </Badge>
                        ) : null}
                        {!service.isActive && (
                          <Badge variant="secondary" className="text-xs">
                            Inativo
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{formatDuration(service.duration)}</span>
                        <span>·</span>
                        <span>{formatCurrency(service.price)}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      disabled={isRemoving}
                      onClick={() => handleRemoveClick(serviceId, service.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Remover {service.name}</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog
        open={removeConfirm.isOpen}
        onOpenChange={(open) => {
          if (!open) setRemoveConfirm({ isOpen: false, serviceId: '', serviceName: '' })
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desvincular serviço?</AlertDialogTitle>
            <AlertDialogDescription>
              O serviço{' '}
              <span className="font-semibold text-foreground">
                {removeConfirm.serviceName}
              </span>{' '}
              será desvinculado deste profissional. Agendamentos futuros com este
              vínculo podem ser afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemove}
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Desvincular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default ServicesTab
