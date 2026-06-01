'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Plus, MoreHorizontal, Clock, CheckCircle2, XCircle, Loader2, RefreshCw, Download } from 'lucide-react'

import Link from 'next/link'
import { Button } from '@/_components/ui/button'
import { Badge } from '@/_components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/_components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/_components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { Input } from '@/_components/ui/input'
import { Label } from '@/_components/ui/label'
import { Textarea } from '@/_components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/_components/ui/table'

import type { DsrRequestDto } from '@/_data-access/privacy/get-dsr-requests'
import { requestDsr } from '@/_actions/privacy/request-dsr'
import { updateDsrStatus } from '@/_actions/privacy/update-dsr-status'
import { exportContactData } from '@/_actions/privacy/export-contact-data'
import { DSR_TYPE_LABELS, DSR_STATUS_CONFIG } from '@/_lib/privacy/consent-labels'
import type { DsrRequestType } from '@prisma/client'

const EXPORTABLE_TYPES = new Set<DsrRequestType>(['ACCESS', 'PORTABILITY'])

const downloadJson = (data: object, filename: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

interface DsrRequestsTabProps {
  requests: DsrRequestDto[]
  orgSlug: string
}

const EMPTY_FORM = {
  requestType: '' as DsrRequestType | '',
  requesterEmail: '',
  requesterName: '',
  notes: '',
}

export const DsrRequestsTab = ({ requests, orgSlug }: DsrRequestsTabProps) => {
  const router = useRouter()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const { execute: executeCreate, isPending: isCreating } = useAction(requestDsr, {
    onSuccess: () => {
      toast.success('Solicitação registrada.', { position: 'bottom-right' })
      setIsCreateOpen(false)
      setForm(EMPTY_FORM)
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao registrar solicitação.', { position: 'bottom-right' })
    },
  })

  const { execute: executeStatus, isPending: isUpdating } = useAction(updateDsrStatus, {
    onSuccess: () => {
      toast.success('Status atualizado.', { position: 'bottom-right' })
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao atualizar status.', { position: 'bottom-right' })
    },
  })

  const { execute: executeExport, isPending: isExporting } = useAction(exportContactData, {
    onSuccess: ({ data, input }) => {
      if (!data?.data) return
      const filename = `dsr-export-${input.contactId}-${new Date().toISOString().split('T')[0]}.json`
      downloadJson(data.data, filename)
      toast.success('Dados exportados com sucesso.', { position: 'bottom-right' })
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao exportar dados.', { position: 'bottom-right' })
    },
  })

  const handleCreate = () => {
    if (!form.requestType || !form.requesterEmail) return
    executeCreate({
      requestType: form.requestType as DsrRequestType,
      requesterEmail: form.requesterEmail,
      requesterName: form.requesterName || undefined,
      notes: form.notes || undefined,
    })
  }

  if (requests.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova solicitação
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/50 py-12 text-center">
          <Clock className="mb-3 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium">Nenhuma solicitação DSR registrada</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Registre aqui pedidos recebidos por WhatsApp, e-mail ou telefone.
          </p>
        </div>
        <CreateDsrDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          form={form}
          setForm={setForm}
          onSubmit={handleCreate}
          isPending={isCreating}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova solicitação
        </Button>
      </div>

      <div className="rounded-lg border border-border/50">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Solicitante</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => {
              const statusConfig = DSR_STATUS_CONFIG[request.status]
              return (
                <TableRow key={request.id}>
                  <TableCell>
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{request.requesterEmail}</p>
                      {request.requesterName && (
                        <p className="text-xs text-muted-foreground">{request.requesterName}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{DSR_TYPE_LABELS[request.requestType]}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${statusConfig.className}`}>
                      {statusConfig.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {format(request.createdAt, 'dd/MM/yyyy', { locale: ptBR })}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isUpdating || isExporting}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {request.contactId && (
                          <DropdownMenuItem asChild>
                            <Link href={`/org/${orgSlug}/contacts/${request.contactId}`}>
                              Ver contato
                            </Link>
                          </DropdownMenuItem>
                        )}
                        {request.contactId && EXPORTABLE_TYPES.has(request.requestType) && (
                          <DropdownMenuItem
                            onClick={() => executeExport({ contactId: request.contactId!, dsrRequestId: request.id })}
                          >
                            <Download className="mr-2 h-3.5 w-3.5" />
                            Exportar dados (JSON)
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {request.status !== 'IN_PROGRESS' && (
                          <DropdownMenuItem
                            onClick={() => executeStatus({ dsrRequestId: request.id, status: 'IN_PROGRESS' })}
                          >
                            <RefreshCw className="mr-2 h-3.5 w-3.5" />
                            Marcar em andamento
                          </DropdownMenuItem>
                        )}
                        {request.status !== 'COMPLETED' && (
                          <DropdownMenuItem
                            onClick={() => executeStatus({ dsrRequestId: request.id, status: 'COMPLETED' })}
                          >
                            <CheckCircle2 className="mr-2 h-3.5 w-3.5 text-emerald-400" />
                            Marcar como concluído
                          </DropdownMenuItem>
                        )}
                        {request.status !== 'REJECTED' && (
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => executeStatus({ dsrRequestId: request.id, status: 'REJECTED' })}
                          >
                            <XCircle className="mr-2 h-3.5 w-3.5" />
                            Rejeitar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <CreateDsrDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        form={form}
        setForm={setForm}
        onSubmit={handleCreate}
        isPending={isCreating}
      />
    </div>
  )
}

interface CreateDsrDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  form: typeof EMPTY_FORM
  setForm: (form: typeof EMPTY_FORM) => void
  onSubmit: () => void
  isPending: boolean
}

const CreateDsrDialog = ({ open, onOpenChange, form, setForm, onSubmit, isPending }: CreateDsrDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Registrar solicitação DSR</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="requesterEmail">E-mail do solicitante *</Label>
          <Input
            id="requesterEmail"
            type="email"
            placeholder="email@exemplo.com"
            value={form.requesterEmail}
            onChange={(e) => setForm({ ...form, requesterEmail: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="requesterName">Nome (opcional)</Label>
          <Input
            id="requesterName"
            placeholder="Nome do solicitante"
            value={form.requesterName}
            onChange={(e) => setForm({ ...form, requesterName: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="requestType">Tipo de solicitação *</Label>
          <Select
            value={form.requestType}
            onValueChange={(value) => setForm({ ...form, requestType: value as DsrRequestType })}
          >
            <SelectTrigger id="requestType">
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACCESS">Acesso aos dados</SelectItem>
              <SelectItem value="ERASURE">Exclusão</SelectItem>
              <SelectItem value="PORTABILITY">Portabilidade</SelectItem>
              <SelectItem value="RECTIFICATION">Retificação</SelectItem>
              <SelectItem value="OBJECTION">Oposição</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Observações (opcional)</Label>
          <Textarea
            id="notes"
            placeholder="Canal de chegada, detalhes do pedido..."
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button
          onClick={onSubmit}
          disabled={isPending || !form.requestType || !form.requesterEmail}
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Registrar
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)
