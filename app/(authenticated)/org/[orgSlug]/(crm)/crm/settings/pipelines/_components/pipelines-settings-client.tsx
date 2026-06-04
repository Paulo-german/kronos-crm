'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Star,
  Loader2,
  GitBranch,
  LayoutList,
} from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import { Card, CardContent } from '@/_components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
} from '@/_components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/_components/ui/dropdown-menu'
import { Input } from '@/_components/ui/input'
import { Label } from '@/_components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { updatePipeline } from '@/_actions/pipeline/update-pipeline'
import { deletePipeline } from '@/_actions/pipeline/delete-pipeline'
import { setDefaultPipeline } from '@/_actions/pipeline/set-default-pipeline'
import type { OrgPipelineDto } from '@/_data-access/pipeline/get-org-pipelines'

interface PipelinesSettingsClientProps {
  pipelines: OrgPipelineDto[]
  orgSlug: string
}

// Estado interno para o dialog de delete — identifica o cenário
type DeleteScenario =
  | 'has-deals' // pipeline tem negócios → bloqueado
  | 'only-one' // único pipeline → bloqueado
  | 'is-default' // é default e existem outros → precisa escolher novo default
  | 'simple' // caso simples → confirmação direta

function resolveDeleteScenario(
  pipeline: OrgPipelineDto,
  allPipelines: OrgPipelineDto[],
): DeleteScenario {
  if (pipeline.dealCount > 0) return 'has-deals'
  if (allPipelines.length === 1) return 'only-one'
  if (pipeline.isDefault) return 'is-default'
  return 'simple'
}

export function PipelinesSettingsClient({
  pipelines,
  orgSlug,
}: PipelinesSettingsClientProps) {
  // --- estados dos dialogs ---
  const [editingPipeline, setEditingPipeline] = useState<OrgPipelineDto | null>(
    null,
  )
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editName, setEditName] = useState('')

  const [deletingPipeline, setDeletingPipeline] =
    useState<OrgPipelineDto | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [newDefaultId, setNewDefaultId] = useState<string>('')

  // --- actions ---
  const { execute: executeUpdate, isPending: isUpdating } = useAction(
    updatePipeline,
    {
      onSuccess: () => {
        toast.success('Funil atualizado com sucesso!')
        setIsEditOpen(false)
        setEditingPipeline(null)
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao atualizar funil.')
      },
    },
  )

  const { execute: executeDelete, isPending: isDeleting } = useAction(
    deletePipeline,
    {
      onSuccess: () => {
        toast.success('Funil excluído com sucesso.')
        setIsDeleteOpen(false)
        setDeletingPipeline(null)
        setNewDefaultId('')
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao excluir funil.')
      },
    },
  )

  const { execute: executeSetDefault, isPending: isSettingDefault } = useAction(
    setDefaultPipeline,
    {
      onSuccess: () => {
        toast.success('Funil padrão definido com sucesso!')
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao definir funil padrão.')
      },
    },
  )

  // --- handlers ---
  const handleEditClick = (pipeline: OrgPipelineDto) => {
    setEditingPipeline(pipeline)
    setEditName(pipeline.name)
    setIsEditOpen(true)
  }

  const handleDeleteClick = (pipeline: OrgPipelineDto) => {
    setDeletingPipeline(pipeline)
    setNewDefaultId('')
    setIsDeleteOpen(true)
  }

  const handleConfirmUpdate = () => {
    if (!editingPipeline || !editName.trim()) return
    executeUpdate({ pipelineId: editingPipeline.id, name: editName })
  }

  const handleConfirmDelete = () => {
    if (!deletingPipeline) return
    executeDelete({
      pipelineId: deletingPipeline.id,
      ...(newDefaultId ? { newDefaultPipelineId: newDefaultId } : {}),
    })
  }

  // --- Resolução do cenário de delete ---
  const deleteScenario = deletingPipeline
    ? resolveDeleteScenario(deletingPipeline, pipelines)
    : null

  // Pipelines disponíveis para virar o novo default (excluindo o que está sendo deletado)
  const otherPipelines = deletingPipeline
    ? pipelines.filter((pipeline) => pipeline.id !== deletingPipeline.id)
    : []

  // --- Empty state ---
  if (pipelines.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <div className="rounded-full bg-muted p-4">
            <GitBranch className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold">Nenhum funil criado</h3>
            <p className="text-sm text-muted-foreground">
              Crie seu primeiro funil de vendas para organizar seus negócios.
            </p>
          </div>
        </div>
        {renderDialogs()}
      </>
    )
  }

  // --- Grid state ---
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {pipelines.map((pipeline) => (
          <Link
            key={pipeline.id}
            href={`/org/${orgSlug}/settings/pipelines/${pipeline.id}`}
            className="block"
          >
            <Card className="flex min-h-[50px] cursor-pointer flex-col transition-colors hover:border-primary/50">
              <CardContent className="flex flex-1 flex-col justify-center gap-3 p-6">
                {/* Nome + badge + dropdown na mesma linha */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-1 items-center gap-2 pt-1">
                    <h3 className="text-base font-semibold leading-tight">
                      {pipeline.name}
                    </h3>
                    {pipeline.isDefault && (
                      <Badge
                        variant="secondary"
                        className="bg-primary/10 text-primary"
                      >
                        <Star className="mr-1 h-3 w-3" />
                        Padrão
                      </Badge>
                    )}
                  </div>
                  {/* stopPropagation evita navegar ao clicar no menu */}
                  <div onClick={(e) => e.preventDefault()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-muted-foreground"
                          onClick={(e) => e.preventDefault()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Ações do funil</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault()
                            handleEditClick(pipeline)
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar nome
                        </DropdownMenuItem>
                        {!pipeline.isDefault && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.preventDefault()
                              executeSetDefault({ pipelineId: pipeline.id })
                            }}
                            disabled={isSettingDefault}
                          >
                            <Star className="mr-2 h-4 w-4" />
                            Definir como padrão
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault()
                            handleDeleteClick(pipeline)
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Stats footer */}
                <div className="flex items-center gap-4 border-t pt-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <LayoutList className="h-3.5 w-3.5" />
                    <span>
                      {pipeline.stageCount}{' '}
                      {pipeline.stageCount === 1 ? 'etapa' : 'etapas'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <GitBranch className="h-3.5 w-3.5" />
                    <span>
                      {pipeline.dealCount}{' '}
                      {pipeline.dealCount === 1 ? 'negócio' : 'negócios'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}

      </div>

      {renderDialogs()}
    </>
  )

  // Função que renderiza todos os dialogs (evita duplicação entre empty/grid state)
  function renderDialogs() {
    return (
      <>
        {/* Dialog de edição de nome */}
        <Dialog
          open={isEditOpen}
          onOpenChange={(open) => {
            setIsEditOpen(open)
            if (!open) setEditingPipeline(null)
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Funil</DialogTitle>
              <DialogDescription>
                Altere o nome do funil de vendas.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="edit-pipeline-name">Nome do funil</Label>
              <Input
                id="edit-pipeline-name"
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleConfirmUpdate()
                }}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditOpen(false)
                  setEditingPipeline(null)
                }}
                disabled={isUpdating}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmUpdate}
                disabled={
                  !editName.trim() ||
                  isUpdating ||
                  editName === editingPipeline?.name
                }
              >
                {isUpdating && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de exclusão — 4 cenários */}
        <AlertDialog
          open={isDeleteOpen}
          onOpenChange={(open) => {
            setIsDeleteOpen(open)
            if (!open) {
              setDeletingPipeline(null)
              setNewDefaultId('')
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir funil</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  {deleteScenario === 'has-deals' && (
                    <p>
                      Não é possível excluir o funil{' '}
                      <span className="font-semibold text-foreground">
                        {deletingPipeline?.name}
                      </span>{' '}
                      porque ele contém{' '}
                      <span className="font-semibold text-foreground">
                        {deletingPipeline?.dealCount}{' '}
                        {deletingPipeline?.dealCount === 1
                          ? 'negócio'
                          : 'negócios'}
                      </span>
                      . Mova-os para outro funil antes de prosseguir.
                    </p>
                  )}
                  {deleteScenario === 'only-one' && (
                    <p>
                      Não é possível excluir o único funil da organização. Crie
                      outro funil antes de excluir este.
                    </p>
                  )}
                  {deleteScenario === 'is-default' && (
                    <>
                      <p>
                        O funil{' '}
                        <span className="font-semibold text-foreground">
                          {deletingPipeline?.name}
                        </span>{' '}
                        é o padrão da organização. Selecione qual funil será o
                        novo padrão antes de excluir:
                      </p>
                      <div className="space-y-1.5">
                        <Label htmlFor="new-default-select">
                          Novo funil padrão
                        </Label>
                        <Select
                          value={newDefaultId}
                          onValueChange={setNewDefaultId}
                        >
                          <SelectTrigger id="new-default-select">
                            <SelectValue placeholder="Selecione um funil..." />
                          </SelectTrigger>
                          <SelectContent>
                            {otherPipelines.map((pipeline) => (
                              <SelectItem key={pipeline.id} value={pipeline.id}>
                                {pipeline.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                  {deleteScenario === 'simple' && (
                    <p>
                      Tem certeza que deseja excluir o funil{' '}
                      <span className="font-semibold text-foreground">
                        {deletingPipeline?.name}
                      </span>
                      ? Esta ação não pode ser desfeita.
                    </p>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(event) => {
                  // Previne o fechamento automático — deixa o useAction controlar
                  event.preventDefault()
                  handleConfirmDelete()
                }}
                disabled={
                  isDeleting ||
                  deleteScenario === 'has-deals' ||
                  deleteScenario === 'only-one' ||
                  (deleteScenario === 'is-default' && !newDefaultId)
                }
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {deleteScenario === 'is-default'
                  ? 'Excluir e transferir padrão'
                  : 'Excluir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </>
    )
  }
}
