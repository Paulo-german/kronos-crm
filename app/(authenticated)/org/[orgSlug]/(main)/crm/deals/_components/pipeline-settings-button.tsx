'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Settings2Icon } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import type { PipelineWithStagesDto } from '@/_data-access/pipeline/get-user-pipeline'

interface PipelineSettingsButtonProps {
  pipeline: PipelineWithStagesDto
}

export function PipelineSettingsButton({
  pipeline,
}: PipelineSettingsButtonProps) {
  const params = useParams<{ orgSlug: string }>()

  return (
    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
      <Link
        href={`/org/${params.orgSlug}/settings/pipelines/${pipeline.id}`}
      >
        <Settings2Icon className="h-4 w-4" />
        <span className="sr-only">Configurações do pipeline</span>
      </Link>
    </Button>
  )
}
