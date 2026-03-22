'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Loader2, Save, Plus, Box, CircleIcon } from 'lucide-react'

import { Badge } from '@/_components/ui/badge'
import { Input } from '@/_components/ui/input'
import { Textarea } from '@/_components/ui/textarea'
import { Switch } from '@/_components/ui/switch'
import { Label } from '@/_components/ui/label'
import { Button } from '@/_components/ui/button'

import { upsertPlan } from '@/_actions/admin/upsert-plan'
import type { AdminPlanDetailDto, AdminModuleDto, AdminFeatureDto } from '@/_data-access/admin/types'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

interface PlanFormProps {
  plan?: AdminPlanDetailDto | null
  modules: AdminModuleDto[]
  features: AdminFeatureDto[]
}

export const PlanForm = ({ plan, modules, features }: PlanFormProps) => {
  const router = useRouter()
  const isEditing = Boolean(plan?.id)

  const [name, setName] = useState(plan?.name ?? '')
  const [slug, setSlug] = useState(plan?.slug ?? '')
  const [description, setDescription] = useState(plan?.description ?? '')
  const [stripeProductId, setStripeProductId] = useState(plan?.stripeProductId ?? '')
  const [isActive, setIsActive] = useState(plan?.isActive ?? true)

  const [selectedModuleIds, setSelectedModuleIds] = useState<Set<string>>(
    () => new Set(plan?.moduleIds ?? []),
  )

  const [limits, setLimits] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    for (const limit of plan?.limits ?? []) {
      if (limit.valueNumber !== null) {
        initial[limit.featureKey] = limit.valueNumber
      }
    }
    return initial
  })

  const [slugManuallyEdited, setSlugManuallyEdited] = useState(isEditing)

  useEffect(() => {
    if (slugManuallyEdited) return
    setSlug(slugify(name))
  }, [name, slugManuallyEdited])

  const featuresByModule = useMemo(() => {
    const grouped = new Map<string, AdminFeatureDto[]>()
    for (const feature of features) {
      if (!feature.module) continue
      const moduleSlug = feature.module.slug
      const existing = grouped.get(moduleSlug) ?? []
      grouped.set(moduleSlug, [...existing, feature])
    }
    return grouped
  }, [features])

  const activeModules = useMemo(
    () => modules.filter((module) => selectedModuleIds.has(module.id)),
    [modules, selectedModuleIds],
  )

  const { execute, status } = useAction(upsertPlan, {
    onSuccess: () => {
      toast.success(isEditing ? 'Plano atualizado com sucesso.' : 'Plano criado com sucesso.')
      router.push('/admin/plans')
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao salvar plano.')
    },
  })

  const isPending = status === 'executing'

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()

    const activeLimits = features
      .filter((feature) => {
        if (!feature.module) return false
        const moduleForFeature = modules.find((module) => module.slug === feature.module?.slug)
        return moduleForFeature ? selectedModuleIds.has(moduleForFeature.id) : false
      })
      .map((feature) => ({
        featureKey: feature.key,
        valueNumber: limits[feature.key] ?? 0,
      }))

    execute({
      ...(plan?.id ? { id: plan.id } : {}),
      name,
      slug,
      description,
      stripeProductId,
      isActive,
      moduleIds: Array.from(selectedModuleIds),
      limits: activeLimits,
    })
  }

  const toggleModule = (moduleId: string) => {
    setSelectedModuleIds((prev) => {
      const next = new Set(prev)
      if (next.has(moduleId)) {
        next.delete(moduleId)
      } else {
        next.add(moduleId)
      }
      return next
    })
  }

  const handleLimitChange = (featureKey: string, rawValue: string) => {
    const parsed = parseInt(rawValue, 10)
    if (!isNaN(parsed) && parsed >= 0) {
      setLimits((prev) => ({ ...prev, [featureKey]: parsed }))
      return
    }
    if (rawValue === '') {
      setLimits((prev) => ({ ...prev, [featureKey]: 0 }))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* ------------------------------------------------------------------ */}
      {/* Seção 1 — Informações do Plano                                      */}
      {/* ------------------------------------------------------------------ */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {/* Section Header */}
        <div className="flex items-center gap-2.5 border-b border-border/50 p-3.5">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-kronos-purple/10">
            <CircleIcon className="h-2 w-2 fill-kronos-purple text-kronos-purple" />
          </div>
          <p className="text-sm font-semibold">Informações do Plano</p>
        </div>

        <div className="space-y-5 p-4">
          {/* Nome + Slug */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="plan-name">
                Nome <span className="text-destructive">*</span>
              </Label>
              <Input
                id="plan-name"
                placeholder="Ex: Essential"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-slug">
                Slug <span className="text-destructive">*</span>
              </Label>
              <Input
                id="plan-slug"
                placeholder="Ex: essential"
                value={slug}
                onChange={(event) => {
                  setSlugManuallyEdited(true)
                  setSlug(event.target.value)
                }}
                required
                disabled={isPending}
                className="text-sm"
              />
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="plan-description">
              Descrição{' '}
              <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Textarea
              id="plan-description"
              placeholder="Descreva brevemente o plano e seu público-alvo..."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={isPending}
              className="min-h-[80px] resize-none"
            />
          </div>

          {/* Stripe Product ID */}
          <div className="space-y-2">
            <Label htmlFor="plan-stripe-id">
              Stripe Product ID{' '}
              <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id="plan-stripe-id"
              placeholder="prod_..."
              value={stripeProductId}
              onChange={(event) => setStripeProductId(event.target.value)}
              disabled={isPending}
              className="text-sm"
            />
          </div>

          <div className="border-t border-border/50 pt-4">
            <div className="flex items-center gap-3">
              <Switch
                id="plan-active"
                checked={isActive}
                onCheckedChange={setIsActive}
                disabled={isPending}
              />
              <Label htmlFor="plan-active" className="cursor-pointer">
                Plano ativo{' '}
                <span className="font-normal text-muted-foreground">
                  — visível para assinatura
                </span>
              </Label>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Seção 2 — Módulos                                                   */}
      {/* ------------------------------------------------------------------ */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2.5 border-b border-border/50 p-3.5">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-kronos-purple/10">
            <CircleIcon className="h-2 w-2 fill-kronos-purple text-kronos-purple" />
          </div>
          <p className="text-sm font-semibold">Módulos</p>
          <span className="flex h-5 items-center justify-center rounded-full bg-muted px-2 text-[10px] font-bold text-muted-foreground">
            {selectedModuleIds.size}/{modules.length}
          </span>
        </div>

        <div className="p-4">
          {modules.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum módulo cadastrado.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {modules.map((module) => {
                const isModuleActive = selectedModuleIds.has(module.id)
                return (
                  <div
                    key={module.id}
                    className={`flex items-center justify-between rounded-xl border p-3.5 transition-all ${
                      isModuleActive
                        ? 'border-kronos-purple/30 bg-kronos-purple/[0.03]'
                        : 'border-border bg-card hover:bg-card/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                          isModuleActive
                            ? 'bg-kronos-purple/10 text-kronos-purple'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <Box className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold leading-tight">{module.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {module.featureCount}{' '}
                          {module.featureCount === 1 ? 'feature' : 'features'}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={isModuleActive}
                      onCheckedChange={() => toggleModule(module.id)}
                      disabled={isPending}
                      aria-label={`Ativar módulo ${module.name}`}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Seção 3 — Limites por Feature                                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2.5 border-b border-border/50 p-3.5">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-kronos-purple/10">
            <CircleIcon className="h-2 w-2 fill-kronos-purple text-kronos-purple" />
          </div>
          <p className="text-sm font-semibold">Limites por Feature</p>
        </div>

        <div className="p-4">
          {activeModules.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/20 py-8 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Plus className="h-5 w-5 text-muted-foreground/40" />
              </div>
              <p className="text-xs text-muted-foreground/50">
                Selecione ao menos um módulo para configurar os limites.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {activeModules.map((module) => {
                const moduleFeatures = featuresByModule.get(module.slug) ?? []

                if (moduleFeatures.length === 0) return null

                return (
                  <div key={module.id}>
                    {/* Module group header */}
                    <div className="mb-3 flex items-center gap-2.5">
                      <div className="flex h-6 w-6 items-center justify-center rounded bg-kronos-purple/10">
                        <Box className="h-3.5 w-3.5 text-kronos-purple" />
                      </div>
                      <p className="text-sm font-semibold">{module.name}</p>
                      <span className="flex h-5 items-center justify-center rounded-full bg-muted px-2 text-[10px] font-bold text-muted-foreground">
                        {moduleFeatures.length}
                      </span>
                      <div className="h-px flex-1 bg-border/50" />
                    </div>

                    {/* Feature limit rows */}
                    <div className="space-y-2">
                      {moduleFeatures.map((feature) => (
                        <div
                          key={feature.key}
                          className="flex items-center justify-between rounded-xl border border-border bg-card p-3.5 transition-all hover:bg-card/80"
                        >
                          <div className="min-w-0 flex-1 pr-4">
                            <p className="text-sm font-semibold leading-tight">
                              {feature.name}
                            </p>
                            <code className="mt-0.5 block text-[10px] text-muted-foreground">
                              {feature.key}
                            </code>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="border-kronos-blue/20 bg-kronos-blue/10 px-2 text-[10px] font-semibold text-kronos-blue"
                            >
                              {feature.valueType}
                            </Badge>
                            <Input
                              type="number"
                              min={0}
                              value={limits[feature.key] ?? 0}
                              onChange={(event) =>
                                handleLimitChange(feature.key, event.target.value)
                              }
                              disabled={isPending}
                              className="h-8 w-28 text-right tabular-nums"
                              aria-label={`Limite para ${feature.name}`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Footer                                                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center justify-end border-t border-border/50 pt-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {isEditing ? 'Salvar Plano' : 'Criar Plano'}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
