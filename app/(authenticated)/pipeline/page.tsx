import { createClient } from '@/_lib/supabase/server'
import { getUserPipeline } from '@/_data-access/pipeline/get-user-pipeline'
import { getDealsByPipeline } from '@/_data-access/deal/get-deals-by-pipeline'
import { getContacts } from '@/_data-access/contact/get-contacts'
import { PipelineClient } from '@/(authenticated)/pipeline/_components/pipeline-client'
import { createDefaultPipeline } from '@/_actions/pipeline/create-default-pipeline'

import Link from 'next/link'
import { Button } from '@/_components/ui/button'
import { Settings } from 'lucide-react'

const PipelinePage = async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Busca pipeline do usuário (ou cria se não existir)
  const pipeline = await getUserPipeline(user.id)

  // Se não existir, cria o pipeline padrão (que já retorna o objeto criado)
  const finalPipeline =
    pipeline || (await createDefaultPipeline({ userId: user.id }))

  // Busca deals e contatos em paralelo
  const [dealsByStage, contacts] = await Promise.all([
    finalPipeline
      ? getDealsByPipeline(finalPipeline.stages.map((s) => s.id))
      : {},
    getContacts(user.id),
  ])

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pipeline de Vendas</h1>
          <p className="text-muted-foreground">
            Visualize e gerencie suas oportunidades.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/pipeline/settings">
            <Settings className="mr-2 h-4 w-4" />
            Configurar Pipeline
          </Link>
        </Button>
      </div>
      <PipelineClient
        pipeline={finalPipeline}
        dealsByStage={dealsByStage}
        contacts={contacts}
      />
    </div>
  )
}

export default PipelinePage
