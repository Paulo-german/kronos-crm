'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2, CircleIcon, Layers } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/_components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import { Input } from '@/_components/ui/input'

import { upsertFeature } from '@/_actions/admin/upsert-feature'
import { deleteFeature } from '@/_actions/admin/delete-feature'
import { upsertFeatureSchema } from '@/_actions/admin/upsert-feature/schema'
import type { AdminFeatureDto, AdminModuleDto } from '@/_data-access/admin/types'

type FeatureFormValues = z.infer<typeof upsertFeatureSchema>

interface FeaturesTabProps {
  features: AdminFeatureDto[]
  modules: AdminModuleDto[]
}

const TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  STATIC: {
    label: 'ESTÁTICO',
    className:
      'border-kronos-blue/20 bg-kronos-blue/10 text-kronos-blue hover:bg-kronos-blue/20',
  },
  METERED: {
    label: 'MEDIDO',
    className:
      'border-kronos-yellow/20 bg-kronos-yellow/10 text-kronos-yellow hover:bg-kronos-yellow/20',
  },
}

function generateFeatureKey(moduleName: string, featureName: string): string {
  const normalizedModule = moduleName.toLowerCase().replace(/\s+/g, '_')
  const normalizedFeature = featureName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
  return `${normalizedModule}.${normalizedFeature}`
}

export const FeaturesTab = ({ features, modules }: FeaturesTabProps) => {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingFeature, setEditingFeature] = useState<AdminFeatureDto | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const form = useForm<FeatureFormValues>({
    resolver: zodResolver(upsertFeatureSchema),
    defaultValues: {
      key: '',
      name: '',
      type: 'STATIC',
      valueType: 'NUMBER',
      moduleId: '',
    },
  })

  const isEditing = Boolean(editingFeature)
  const watchedName = form.watch('name')
  const watchedModuleId = form.watch('moduleId')

  const { execute: executeUpsert, status: upsertStatus } = useAction(upsertFeature, {
    onSuccess: () => {
      toast.success(isEditing ? 'Feature atualizada com sucesso.' : 'Feature criada com sucesso.')
      setDialogOpen(false)
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao salvar feature.')
    },
  })

  const { execute: executeDelete, status: deleteStatus } = useAction(deleteFeature, {
    onSuccess: () => {
      toast.success('Feature excluída com sucesso.')
      setPendingDeleteId(null)
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao excluir feature.')
      setPendingDeleteId(null)
    },
  })

  const isUpsertPending = upsertStatus === 'executing'
  const isDeletePending = deleteStatus === 'executing'

  const handleOpenCreate = () => {
    setEditingFeature(null)
    form.reset({
      key: '',
      name: '',
      type: 'STATIC',
      valueType: 'NUMBER',
      moduleId: modules[0]?.id ?? '',
    })
    setDialogOpen(true)
  }

  const handleOpenEdit = (feature: AdminFeatureDto) => {
    const matchingModule = modules.find((module) => module.slug === feature.module?.slug)
    setEditingFeature(feature)
    form.reset({
      id: feature.id,
      key: feature.key,
      name: feature.name,
      type: feature.type as 'STATIC' | 'METERED',
      valueType: feature.valueType as 'NUMBER' | 'BOOLEAN' | 'STRING',
      moduleId: matchingModule?.id ?? '',
    })
    setDialogOpen(true)
  }

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setDialogOpen(false)
      setEditingFeature(null)
    }
  }

  const handleSubmit = form.handleSubmit((values) => {
    executeUpsert(values)
  })

  const handleConfirmDelete = () => {
    if (!pendingDeleteId) return
    executeDelete({ featureId: pendingDeleteId })
  }

  const handleNameChange = (name: string) => {
    form.setValue('name', name)
    if (isEditing) return

    const selectedModule = modules.find((module) => module.id === watchedModuleId)
    if (selectedModule && name.trim()) {
      form.setValue('key', generateFeatureKey(selectedModule.slug, name))
    }
  }

  const handleModuleChange = (moduleId: string) => {
    form.setValue('moduleId', moduleId)
    if (isEditing) return

    const selectedModule = modules.find((module) => module.id === moduleId)
    if (selectedModule && watchedName.trim()) {
      form.setValue('key', generateFeatureKey(selectedModule.slug, watchedName))
    }
  }

  // Agrupar features por módulo
  const featuresByModule = new Map<string, AdminFeatureDto[]>()
  for (const feature of features) {
    const moduleSlug = feature.module?.slug ?? '_sem_modulo'
    const existing = featuresByModule.get(moduleSlug) ?? []
    featuresByModule.set(moduleSlug, [...existing, feature])
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {features.length} {features.length === 1 ? 'feature cadastrada' : 'features cadastradas'}
        </p>
        <Button size="sm" onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Feature
        </Button>
      </div>

      {/* Features agrupadas por módulo */}
      {features.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/20 py-16 text-center transition-all duration-200">
          <Layers className="mb-4 h-10 w-10 text-muted-foreground/40" />
          <h3 className="text-sm font-semibold text-foreground">Nenhuma feature cadastrada</h3>
          <p className="mt-1 text-xs text-muted-foreground/50">
            Crie a primeira feature para começar.
          </p>
          <Button className="mt-4" size="sm" onClick={handleOpenCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Criar primeira feature
          </Button>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {Array.from(featuresByModule.entries()).map(([moduleSlug, moduleFeatures]) => {
            const moduleName =
              moduleFeatures[0]?.module?.name ?? 'Sem módulo'

            return (
              <div key={moduleSlug}>
                {/* Module group header */}
                <div className="mb-3 flex items-center gap-2.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-kronos-purple/10">
                    <CircleIcon className="h-2 w-2 fill-kronos-purple text-kronos-purple" />
                  </div>
                  <p className="text-sm font-semibold">{moduleName}</p>
                  <span className="flex h-5 items-center justify-center rounded-full bg-muted px-2 text-[10px] font-bold text-muted-foreground">
                    {moduleFeatures.length}
                  </span>
                  <div className="h-px flex-1 bg-border/50" />
                </div>

                {/* Features cards */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {moduleFeatures.map((feature) => {
                    const typeConfig = TYPE_CONFIG[feature.type] ?? {
                      label: feature.type,
                      className: '',
                    }

                    return (
                      <div
                        key={feature.id}
                        className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-none transition-all hover:bg-card/80"
                      >
                        <div className="flex flex-col gap-3 p-3.5">
                          {/* Type Badge + Actions */}
                          <div className="flex items-center justify-between">
                            <Badge
                              variant="outline"
                              className={`h-6 gap-1.5 px-2 text-[10px] font-semibold transition-colors ${typeConfig.className}`}
                            >
                              <CircleIcon className="h-1.5 w-1.5 fill-current" />
                              {typeConfig.label}
                            </Badge>

                            <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                              <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => handleOpenEdit(feature)}
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
                                    onClick={() => setPendingDeleteId(feature.id)}
                                    disabled={isDeletePending}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Excluir</TooltipContent>
                              </Tooltip>
                            </div>
                          </div>

                          {/* Feature name + key */}
                          <div>
                            <p className="text-sm font-semibold leading-tight text-foreground">
                              {feature.name}
                            </p>
                            <code className="mt-0.5 block text-[10px] text-muted-foreground">
                              {feature.key}
                            </code>
                          </div>

                          {/* Stats */}
                          <div className="flex items-center gap-3">
                            <Tooltip delayDuration={0}>
                              <TooltipTrigger asChild>
                                <span className="text-xs text-muted-foreground">
                                  <strong className="font-bold text-foreground">
                                    {feature.planLimitCount}
                                  </strong>{' '}
                                  {feature.planLimitCount === 1 ? 'plano' : 'planos'}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                Presente em {feature.planLimitCount}{' '}
                                {feature.planLimitCount === 1 ? 'plano' : 'planos'}
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Dialog de criação / edição */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar Feature' : 'Nova Feature'}</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormField
                control={form.control}
                name="moduleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Módulo</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={handleModuleChange}
                        disabled={isUpsertPending}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o módulo" />
                        </SelectTrigger>
                        <SelectContent>
                          {modules.map((module) => (
                            <SelectItem key={module.id} value={module.id}>
                              {module.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Max Contacts"
                        {...field}
                        onChange={(event) => handleNameChange(event.target.value)}
                        disabled={isUpsertPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Key{' '}
                      {!isEditing && (
                        <span className="font-normal text-muted-foreground">
                          (gerada automaticamente)
                        </span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: crm.max_contacts"
                        {...field}
                        disabled={isUpsertPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={isUpsertPending}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="STATIC">Estático</SelectItem>
                            <SelectItem value="METERED">Medido</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="valueType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo do valor</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={isUpsertPending}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NUMBER">Número</SelectItem>
                            <SelectItem value="BOOLEAN">Booleano</SelectItem>
                            <SelectItem value="STRING">Texto</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={isUpsertPending}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isUpsertPending}>
                  {isUpsertPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
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
            <AlertDialogTitle>Excluir feature?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A feature será removida permanentemente. Features com
              limites de plano vinculados não podem ser excluídas.
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
