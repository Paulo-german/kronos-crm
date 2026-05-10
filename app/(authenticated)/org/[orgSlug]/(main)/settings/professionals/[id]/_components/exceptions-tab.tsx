'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarIcon, Loader2, Plus, Trash2, CalendarOff } from 'lucide-react'

import { Button } from '@/_components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { Badge } from '@/_components/ui/badge'
import { Input } from '@/_components/ui/input'
import { Label } from '@/_components/ui/label'
import { Separator } from '@/_components/ui/separator'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/_components/ui/popover'
import { Calendar } from '@/_components/ui/calendar'
import { cn } from '@/_lib/utils'

import { addWorkingHoursException } from '@/_actions/working-hours/add-working-hours-exception'
import { removeWorkingHoursException } from '@/_actions/working-hours/remove-working-hours-exception'
import type { ProfessionalDetailDto } from '@/_data-access/professional/get-professional-by-id'

type ExceptionType = 'OFF' | 'CUSTOM_HOURS'

interface NewExceptionState {
  date: Date | undefined
  type: ExceptionType
  startTime: string
  endTime: string
}

interface RemoveConfirmState {
  isOpen: boolean
  exceptionId: string
  exceptionDate: string
}

interface ExceptionsTabProps {
  professional: ProfessionalDetailDto
}

const ExceptionsTab = ({ professional }: ExceptionsTabProps) => {
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [newException, setNewException] = useState<NewExceptionState>({
    date: undefined,
    type: 'OFF',
    startTime: '08:00',
    endTime: '18:00',
  })
  const [removeConfirm, setRemoveConfirm] = useState<RemoveConfirmState>({
    isOpen: false,
    exceptionId: '',
    exceptionDate: '',
  })

  const { execute: executeAdd, isPending: isAdding } = useAction(
    addWorkingHoursException,
    {
      onSuccess: () => {
        toast.success('Exceção adicionada com sucesso!')
        setNewException({ date: undefined, type: 'OFF', startTime: '08:00', endTime: '18:00' })
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao adicionar exceção.')
      },
    },
  )

  const { execute: executeRemove, isPending: isRemoving } = useAction(
    removeWorkingHoursException,
    {
      onSuccess: () => {
        toast.success('Exceção removida com sucesso!')
        setRemoveConfirm({ isOpen: false, exceptionId: '', exceptionDate: '' })
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao remover exceção.')
      },
    },
  )

  const handleAddException = () => {
    if (!newException.date) {
      toast.error('Selecione uma data para a exceção.')
      return
    }

    executeAdd({
      professionalId: professional.id,
      date: newException.date,
      type: newException.type,
      ...(newException.type === 'CUSTOM_HOURS'
        ? { startTime: newException.startTime, endTime: newException.endTime }
        : {}),
    })
  }

  const handleRemoveClick = (exceptionId: string, date: Date) => {
    setRemoveConfirm({
      isOpen: true,
      exceptionId,
      exceptionDate: format(date, "dd/MM/yyyy", { locale: ptBR }),
    })
  }

  const handleConfirmRemove = () => {
    executeRemove({
      id: removeConfirm.exceptionId,
      professionalId: professional.id,
    })
  }

  const isFormValid =
    newException.date !== undefined &&
    (newException.type === 'OFF' ||
      (newException.startTime && newException.endTime))

  return (
    <>
      <div className="space-y-4">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Adicionar Exceção
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Cadastre folgas ou horários especiais em datas específicas. A exceção
              prevalece sobre a jornada semanal padrão.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="exception-date">Data da Exceção</Label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="exception-date"
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !newException.date && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newException.date
                        ? format(newException.date, "dd/MM/yyyy", { locale: ptBR })
                        : 'Selecionar data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newException.date}
                      onSelect={(date) => {
                        setNewException((prev) => ({ ...prev, date }))
                        setCalendarOpen(false)
                      }}
                      locale={ptBR}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="exception-type">Tipo de Exceção</Label>
                <Select
                  value={newException.type}
                  onValueChange={(value) =>
                    setNewException((prev) => ({ ...prev, type: value as ExceptionType }))
                  }
                >
                  <SelectTrigger id="exception-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OFF">Folga (dia inteiro)</SelectItem>
                    <SelectItem value="CUSTOM_HOURS">Horário especial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {newException.type === 'CUSTOM_HOURS' && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="exception-start">Início</Label>
                  <Input
                    id="exception-start"
                    type="time"
                    value={newException.startTime}
                    onChange={(event) =>
                      setNewException((prev) => ({ ...prev, startTime: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exception-end">Fim</Label>
                  <Input
                    id="exception-end"
                    type="time"
                    value={newException.endTime}
                    onChange={(event) =>
                      setNewException((prev) => ({ ...prev, endTime: event.target.value }))
                    }
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={handleAddException}
                disabled={!isFormValid || isAdding}
              >
                {isAdding ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Adicionar Exceção
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Exceções Cadastradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {professional.workingHoursExceptions.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/50 py-10 text-center">
                <CalendarOff className="mb-3 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm font-medium text-muted-foreground">
                  Nenhuma exceção cadastrada
                </p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  Folgas e horários especiais aparecerão aqui.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {professional.workingHoursExceptions.map((exception, index) => (
                  <div key={exception.id}>
                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium tabular-nums">
                          {format(exception.date, 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                        {exception.type === 'OFF' ? (
                          <Badge className="bg-red-500/15 text-red-600 hover:bg-red-500/20 border-red-500/20">
                            Folga
                          </Badge>
                        ) : (
                          <Badge className="bg-blue-500/15 text-blue-600 hover:bg-blue-500/20 border-blue-500/20">
                            Horário especial
                          </Badge>
                        )}
                        {exception.type === 'CUSTOM_HOURS' &&
                          exception.startTime &&
                          exception.endTime && (
                            <span className="text-sm text-muted-foreground">
                              {exception.startTime} – {exception.endTime}
                            </span>
                          )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        disabled={isRemoving}
                        onClick={() =>
                          handleRemoveClick(exception.id, exception.date)
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">
                          Remover exceção de {format(exception.date, 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      </Button>
                    </div>
                    {index < professional.workingHoursExceptions.length - 1 && (
                      <Separator className="opacity-50" />
                    )}
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
          if (!open) setRemoveConfirm({ isOpen: false, exceptionId: '', exceptionDate: '' })
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover exceção?</AlertDialogTitle>
            <AlertDialogDescription>
              A exceção do dia{' '}
              <span className="font-semibold text-foreground">
                {removeConfirm.exceptionDate}
              </span>{' '}
              será removida. A jornada semanal padrão voltará a valer para esta data.
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
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default ExceptionsTab
