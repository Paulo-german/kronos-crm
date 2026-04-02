'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Lock, Loader2 } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Button } from '@/_components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/_components/ui/dialog'
import { Input } from '@/_components/ui/input'
import { Label } from '@/_components/ui/label'
import { createPipeline } from '@/_actions/pipeline/create-pipeline'
import type { PlanType } from '@/_lib/rbac/plan-limits'

interface CreatePipelineButtonProps {
  orgSlug: string
  withinQuota: boolean
  planType: PlanType | null
}

export function CreatePipelineButton({
  orgSlug,
  withinQuota,
  planType,
}: CreatePipelineButtonProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false)
  const [name, setName] = useState('')

  const { execute, isPending } = useAction(createPipeline, {
    onSuccess: () => {
      toast.success('Funil criado com sucesso!')
      setIsCreateOpen(false)
      setName('')
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao criar funil.')
    },
  })

  const handleClick = () => {
    if (!withinQuota && planType === 'light') {
      setIsUpgradeOpen(true)
      return
    }
    setIsCreateOpen(true)
  }

  const handleCreate = () => {
    if (!name.trim()) return
    execute({ name })
  }

  return (
    <>
      <Button onClick={handleClick}>
        {!withinQuota && planType === 'light' ? (
          <Lock className="mr-2 h-4 w-4" />
        ) : (
          <Plus className="mr-2 h-4 w-4" />
        )}
        Novo Funil
      </Button>

      {/* Dialog de criação */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Funil de Vendas</DialogTitle>
            <DialogDescription>
              Dê um nome ao seu funil. Ele será criado com as etapas padrão.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="create-pipeline-name">Nome do funil</Label>
            <Input
              id="create-pipeline-name"
              placeholder="Ex: Vendas B2B, Captação..."
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleCreate()
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false)
                setName('')
              }}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!name.trim() || isPending}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Funil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de upgrade (plano Light) */}
      <Dialog open={isUpgradeOpen} onOpenChange={setIsUpgradeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-muted-foreground" />
              Múltiplos Funis de Vendas
            </DialogTitle>
            <DialogDescription>
              O plano Light permite apenas 1 funil de vendas. Faça upgrade para
              o plano Essential e tenha funis ilimitados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsUpgradeOpen(false)}
            >
              Cancelar
            </Button>
            <Button asChild>
              <Link href={`/org/${orgSlug}/settings/billing`}>
                Fazer Upgrade
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
