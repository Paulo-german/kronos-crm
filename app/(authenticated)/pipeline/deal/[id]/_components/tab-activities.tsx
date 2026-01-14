'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import {
  Phone,
  Mail,
  FileText,
  Users,
  Loader2,
  ArrowRightLeft,
  Package,
  PackageMinus,
  ListTodo,
  CheckCircle2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { Button } from '@/_components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/_components/ui/dialog'
import { Textarea } from '@/_components/ui/textarea'
import { Label } from '@/_components/ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
import { createActivity } from '@/_actions/deal/create-activity'
import type { DealDetailsDto } from '@/_data-access/deal/get-deal-details'

interface TabActivitiesProps {
  deal: DealDetailsDto
}

// Config para todos os tipos de atividade (manuais e sistema)
const activityConfig: Record<
  string,
  { icon: typeof FileText; label: string; color: string }
> = {
  // Manuais
  note: { icon: FileText, label: 'Nota', color: 'text-blue-500' },
  call: { icon: Phone, label: 'Ligação', color: 'text-green-500' },
  email: { icon: Mail, label: 'Email', color: 'text-purple-500' },
  meeting: { icon: Users, label: 'Reunião', color: 'text-orange-500' },
  // Sistema
  stage_change: {
    icon: ArrowRightLeft,
    label: 'Mudança de Etapa',
    color: 'text-primary',
  },
  product_added: {
    icon: Package,
    label: 'Produto Adicionado',
    color: 'text-[#00b37e]',
  },
  product_removed: {
    icon: PackageMinus,
    label: 'Produto Removido',
    color: 'text-destructive',
  },
  task_created: {
    icon: ListTodo,
    label: 'Tarefa Criada',
    color: 'text-amber-500',
  },
  task_completed: {
    icon: CheckCircle2,
    label: 'Tarefa Concluída',
    color: 'text-[#00b37e]',
  },
}

type ManualActivityType = 'note' | 'call' | 'email' | 'meeting'

const TabActivities = ({ deal }: TabActivitiesProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<ManualActivityType>('note')
  const [content, setContent] = useState('')

  const { execute, isPending } = useAction(createActivity, {
    onSuccess: () => {
      toast.success('Atividade registrada!')
      setIsDialogOpen(false)
      setContent('')
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao registrar atividade.')
    },
  })

  const handleCreate = () => {
    if (!content.trim()) {
      toast.error('Digite o conteúdo da atividade.')
      return
    }
    execute({
      dealId: deal.id,
      type: selectedType,
      content: content.trim(),
    })
  }

  const openDialogWithType = (type: ManualActivityType) => {
    setSelectedType(type)
    setContent('')
    setIsDialogOpen(true)
  }

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date))
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Atividades</CardTitle>
        <TooltipProvider>
          <div className="flex gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => openDialogWithType('note')}
                >
                  <FileText className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Nova Nota</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => openDialogWithType('call')}
                >
                  <Phone className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Registrar Ligação</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => openDialogWithType('email')}
                >
                  <Mail className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Registrar Email</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => openDialogWithType('meeting')}
                >
                  <Users className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Registrar Reunião</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </CardHeader>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {(() => {
                const config = activityConfig[selectedType]
                const Icon = config.icon
                return (
                  <>
                    <Icon className={`h-5 w-5 ${config.color}`} />
                    Nova {config.label}
                  </>
                )
              })()}
            </DialogTitle>
            <DialogDescription>
              Registre os detalhes desta atividade.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Textarea
                placeholder={`Descreva a ${activityConfig[selectedType].label.toLowerCase()}...`}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <CardContent>
        {deal.activities.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            Nenhuma atividade registrada ainda.
          </div>
        ) : (
          <div className="space-y-4">
            {deal.activities.map((activity) => {
              const config =
                activityConfig[activity.type] || activityConfig.note
              const Icon = config.icon
              return (
                <div
                  key={activity.id}
                  className="flex gap-4 border-l-2 border-border pl-4"
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted`}
                  >
                    <Icon className={`h-4 w-4 ${config.color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{config.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(activity.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                      {activity.content}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default TabActivities
