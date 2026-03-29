'use client'

import { useState } from 'react'
import { Button } from '@/_components/ui/button'
import { Plus } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/_components/ui/tooltip'
import { AutomationWizardSheet } from './automation-wizard-sheet'
import type { OrgPipelineDto } from '@/_data-access/pipeline/get-org-pipelines'
import type { PipelineStageOption } from '@/_data-access/pipeline/get-pipeline-stages'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'
import type { DealLostReasonDto } from '@/_data-access/settings/get-lost-reasons'

interface CreateAutomationButtonProps {
  withinQuota?: boolean
  pipelines: OrgPipelineDto[]
  stageOptions: PipelineStageOption[]
  members: AcceptedMemberDto[]
  lossReasons: DealLostReasonDto[]
}

const CreateAutomationButton = ({
  withinQuota = true,
  pipelines,
  stageOptions,
  members,
  lossReasons,
}: CreateAutomationButtonProps) => {
  const [isOpen, setIsOpen] = useState(false)

  if (!withinQuota) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <span tabIndex={0}>
            <Button disabled>
              <Plus className="mr-2 h-4 w-4" />
              Nova Automação
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>Limite atingido. Faça upgrade do plano.</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Nova Automação
      </Button>
      <AutomationWizardSheet
        open={isOpen}
        onOpenChange={setIsOpen}
        pipelines={pipelines}
        stageOptions={stageOptions}
        members={members}
        lossReasons={lossReasons}
      />
    </>
  )
}

export default CreateAutomationButton
