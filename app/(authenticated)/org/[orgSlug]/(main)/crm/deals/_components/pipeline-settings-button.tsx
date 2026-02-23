'use client'

import { useState } from 'react'
import { Button } from '@/_components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/_components/ui/sheet'
import { Settings2Icon } from 'lucide-react'
import { SettingsClient } from '../pipeline/_components/settings-client'
import type { PipelineWithStagesDto } from '@/_data-access/pipeline/get-user-pipeline'

interface PipelineSettingsButtonProps {
  pipeline: PipelineWithStagesDto
}

export function PipelineSettingsButton({
  pipeline,
}: PipelineSettingsButtonProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <>
      <Button variant="outline" onClick={() => setSettingsOpen(true)}>
        <Settings2Icon className="mr-2 h-4 w-4" />
        Configurar Pipeline
      </Button>

      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent className="flex w-full flex-col sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Configurações do Pipeline</SheetTitle>
            <SheetDescription>
              Gerencie as etapas do seu funil de vendas.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto">
            <SettingsClient pipeline={pipeline} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
