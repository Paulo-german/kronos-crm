import { createClient } from '@/_lib/supabase/server'
import { getUserPipeline } from '@/_data-access/pipeline/get-user-pipeline'
import { SettingsClient } from '@/(authenticated)/pipeline/settings/_components/settings-client'

import { createDefaultPipeline } from '@/_data-access/pipeline/create-default-pipeline'
import Link from 'next/link'
import { Button } from '@/_components/ui/button'
import { ArrowLeft } from 'lucide-react'

const PipelineSettingsPage = async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Busca pipeline do usuário (ou cria se não existir)
  let pipeline = await getUserPipeline(user.id)

  if (!pipeline) {
    await createDefaultPipeline({ userId: user.id })
    pipeline = await getUserPipeline(user.id)
  }

  if (!pipeline) {
    return (
      <div className="text-muted-foreground">
        Erro ao carregar pipeline. Tente recarregar a página.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/pipeline">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Configurações do Pipeline</h1>
          <p className="text-muted-foreground">
            Gerencie as etapas do seu funil de vendas.
          </p>
        </div>
      </div>

      <SettingsClient pipeline={pipeline} />
    </div>
  )
}

export default PipelineSettingsPage
