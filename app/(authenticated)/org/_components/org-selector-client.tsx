'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Building2, Plus, ArrowRight } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/_components/ui/dialog'
import { Input } from '@/_components/ui/input'
import { Label } from '@/_components/ui/label'
import { createOrganization } from '@/_actions/organization/create-organization'
import type { MemberRole, OrganizationPlan } from '@prisma/client'

interface Organization {
  id: string
  name: string
  slug: string
  plan: OrganizationPlan
  role: MemberRole
}

interface OrgSelectorClientProps {
  organizations: Organization[]
}

export function OrgSelectorClient({ organizations }: OrgSelectorClientProps) {
  const router = useRouter()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newOrgName, setNewOrgName] = useState('')

  const { execute, isPending } = useAction(createOrganization, {
    onSuccess: ({ data }) => {
      if (data?.slug) {
        toast.success('Organização criada com sucesso!')
        router.push(`/org/${data.slug}/dashboard`)
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao criar organização.')
    },
  })

  const handleCreateOrg = () => {
    if (!newOrgName.trim()) {
      toast.error('Digite um nome para a organização.')
      return
    }
    execute({ name: newOrgName.trim() })
  }

  const handleSelectOrg = (slug: string) => {
    router.push(`/org/${slug}/dashboard`)
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Selecione uma Organização</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {organizations.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <Building2 className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p>Você ainda não faz parte de nenhuma organização.</p>
            <p className="text-sm">Crie uma para começar.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {organizations.map((org) => (
              <Button
                key={org.id}
                variant="outline"
                className="w-full justify-between"
                onClick={() => handleSelectOrg(org.slug)}
              >
                <span className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {org.name}
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            ))}
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full" variant="default">
              <Plus className="mr-2 h-4 w-4" />
              Criar Nova Organização
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Organização</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Nome da Organização</Label>
                <Input
                  id="org-name"
                  placeholder="Ex: Minha Empresa"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateOrg()
                  }}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleCreateOrg}
                disabled={isPending}
              >
                {isPending ? 'Criando...' : 'Criar Organização'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
