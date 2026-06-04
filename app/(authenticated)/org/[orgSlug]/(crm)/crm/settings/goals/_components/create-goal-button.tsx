'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { GoalUpsertSheet } from './goal-upsert-sheet'
import type { OrgPipelineDto } from '@/_data-access/pipeline/get-org-pipelines'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'

interface CreateGoalButtonProps {
  pipelines: OrgPipelineDto[]
  members: AcceptedMemberDto[]
}

export function CreateGoalButton({ pipelines, members }: CreateGoalButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Nova meta
      </Button>

      <GoalUpsertSheet
        mode="create"
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        pipelines={pipelines}
        members={members}
      />
    </>
  )
}
