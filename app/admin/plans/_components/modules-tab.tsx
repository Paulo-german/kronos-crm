'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2, CircleIcon, Box, Layers } from 'lucide-react'
import {
  Dialog,
  DialogContent,
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
import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import { Input } from '@/_components/ui/input'
import { Label } from '@/_components/ui/label'
import { Switch } from '@/_components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
import { upsertModule } from '@/_actions/admin/upsert-module'
import { deleteModule } from '@/_actions/admin/delete-module'
import type { AdminModuleDto } from '@/_data-access/admin/types'

interface ModulesTabProps {
  modules: AdminModuleDto[]
}

interface ModuleFormState {
  id?: string
  name: string
  slug: string
  isActive: boolean
}

const EMPTY_FORM: ModuleFormState = {
  id: undefined,
  name: '',
  slug: '',
  isActive: true,
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export const ModulesTab = ({ modules }: ModulesTabProps) => {
  const router = useRouter()
  const [upsertOpen, setUpsertOpen] = useState(false)
  const [formState, setFormState] = useState<ModuleFormState>(EMPTY_FORM)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const { execute: executeUpsert, status: upsertStatus } = useAction(upsertModule, {
    onSuccess: () => {
      const isEdit = Boolean(formState.id)
      toast.success(isEdit ? 'Módulo atualizado com sucesso.' : 'Módulo criado com sucesso.')
      setUpsertOpen(false)
      setFormState(EMPTY_FORM)
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao salvar módulo.')
    },
  })

  const { execute: executeDelete, status: deleteStatus } = useAction(deleteModule, {
    onSuccess: () => {
      toast.success('Módulo excluído com sucesso.')
      setPendingDeleteId(null)
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao excluir módulo.')
      setPendingDeleteId(null)
    },
  })

  const isUpsertPending = upsertStatus === 'executing'
  const isDeletePending = deleteStatus === 'executing'

  const handleOpenCreate = () => {
    setFormState(EMPTY_FORM)
    setUpsertOpen(true)
  }

  const handleOpenEdit = (module: AdminModuleDto) => {
    setFormState({
      id: module.id,
      name: module.name,
      slug: module.slug,
      isActive: module.isActive,
    })
    setUpsertOpen(true)
  }

  const handleNameChange = (value: string) => {
    setFormState((prev) => ({
      ...prev,
      name: value,
      ...(!prev.id && { slug: slugify(value) }),
    }))
  }

  const handleSlugChange = (value: string) => {
    setFormState((prev) => ({ ...prev, slug: value }))
  }

  const handleActiveChange = (checked: boolean) => {
    setFormState((prev) => ({ ...prev, isActive: checked }))
  }

  const handleSubmit = () => {
    if (!formState.name.trim() || !formState.slug.trim()) return
    executeUpsert({
      id: formState.id,
      name: formState.name.trim(),
      slug: formState.slug.trim(),
      isActive: formState.isActive,
    })
  }

  const handleConfirmDelete = () => {
    if (!pendingDeleteId) return
    executeDelete({ moduleId: pendingDeleteId })
  }

  const isEditing = Boolean(formState.id)

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {modules.length} {modules.length === 1 ? 'módulo cadastrado' : 'módulos cadastrados'}
        </p>
        <Button size="sm" onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Módulo
        </Button>
      </div>

      {/* Cards Grid */}
      {modules.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/20 py-16 text-center transition-all duration-200">
          <Layers className="mb-4 h-10 w-10 text-muted-foreground/40" />
          <h3 className="text-sm font-semibold text-foreground">Nenhum módulo cadastrado</h3>
          <p className="mt-1 text-xs text-muted-foreground/50">
            Crie o primeiro módulo para começar.
          </p>
          <Button className="mt-4" size="sm" onClick={handleOpenCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Criar primeiro módulo
          </Button>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {modules.map((module) => (
            <div
              key={module.id}
              className={`group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-none transition-all hover:bg-card/80 ${
                !module.isActive ? 'opacity-50' : ''
              }`}
            >
              <div className="flex flex-col gap-3 p-3.5">
                {/* Status + Actions */}
                <div className="flex items-center justify-between">
                  {module.isActive ? (
                    <Badge
                      variant="outline"
                      className="h-6 gap-1.5 border-kronos-green/20 bg-kronos-green/10 px-2 text-[10px] font-semibold text-kronos-green transition-colors hover:bg-kronos-green/20"
                    >
                      <CircleIcon className="h-1.5 w-1.5 fill-current" />
                      ATIVO
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="h-6 gap-1.5 border-muted-foreground/30 px-2 text-[10px] font-semibold text-muted-foreground"
                    >
                      <CircleIcon className="h-1.5 w-1.5 fill-current" />
                      INATIVO
                    </Badge>
                  )}

                  <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleOpenEdit(module)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Editar</TooltipContent>
                    </Tooltip>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setPendingDeleteId(module.id)}
                          disabled={isDeletePending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Excluir</TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                {/* Module Name */}
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-kronos-purple/10 text-kronos-purple">
                    <Box className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-base font-semibold leading-tight text-foreground">
                      {module.name}
                    </p>
                    <code className="text-[10px] text-muted-foreground">{module.slug}</code>
                  </div>
                </div>

                {/* Features count */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">
                    <strong className="font-bold text-foreground">{module.featureCount}</strong>{' '}
                    {module.featureCount === 1 ? 'feature' : 'features'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog de criar/editar módulo */}
      <Dialog
        open={upsertOpen}
        onOpenChange={(open) => {
          if (!open) {
            setUpsertOpen(false)
            setFormState(EMPTY_FORM)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar Módulo' : 'Novo Módulo'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="module-name">Nome</Label>
              <Input
                id="module-name"
                placeholder="ex: CRM, Inbox, IA"
                value={formState.name}
                onChange={(event) => handleNameChange(event.target.value)}
                disabled={isUpsertPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="module-slug">Slug</Label>
              <Input
                id="module-slug"
                placeholder="ex: crm, inbox, ai"
                value={formState.slug}
                onChange={(event) => handleSlugChange(event.target.value)}
                disabled={isUpsertPending}
              />
              <p className="text-xs text-muted-foreground">
                Identificador único usado internamente. Gerado automaticamente a partir do nome.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="module-active"
                checked={formState.isActive}
                onCheckedChange={handleActiveChange}
                disabled={isUpsertPending}
              />
              <Label htmlFor="module-active" className="cursor-pointer">
                Módulo ativo
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setUpsertOpen(false)
                setFormState(EMPTY_FORM)
              }}
              disabled={isUpsertPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isUpsertPending || !formState.name.trim() || !formState.slug.trim()}
            >
              {isUpsertPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : isEditing ? (
                'Salvar alterações'
              ) : (
                'Criar módulo'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog de confirmação de deleção */}
      <AlertDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir módulo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O módulo será removido permanentemente. Módulos com
              features ou planos vinculados não podem ser excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletePending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeletePending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletePending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
