import type { PromptConfig } from '@/_actions/agent/shared/prompt-config-schema'
import type { BusinessHoursConfig } from '@/_actions/agent/update-agent/schema'

export interface PipelineStageBlueprint {
  name: string
  position: number
  color: string
}

export type BlueprintStepAction =
  | {
      type: 'move_deal'
      trigger: string
      targetStagePosition: number
    }
  | {
      type: 'create_task'
      trigger: string
      title: string
      dueDaysOffset: number
    }
  | {
      type: 'create_event'
      trigger: string
      titleInstructions?: string
      duration?: number
      startTime?: string
      endTime?: string
      allowReschedule?: boolean
      rescheduleInstructions?: string
    }
  | {
      type: 'list_availability'
      trigger: string
      daysAhead?: number
      slotDuration?: number
      startTime?: string
      endTime?: string
    }
  | {
      type: 'hand_off_to_human'
      trigger: string
      notifyTarget?: 'none' | 'specific_number' | 'deal_assignee'
      specificPhone?: string
      notificationMessage?: string
    }
  | {
      type: 'update_deal'
      trigger: string
      allowedFields?: ('title' | 'value' | 'priority' | 'expectedCloseDate' | 'notes')[]
      fixedPriority?: 'low' | 'medium' | 'high' | 'urgent'
      notesTemplate?: string
      allowedStatuses?: ('WON' | 'LOST')[]
    }
  | {
      type: 'search_knowledge'
      trigger: string
    }
  | {
      type: 'update_contact'
      trigger: string
    }

export interface AgentStepBlueprint {
  name: string
  objective: string
  actions: BlueprintStepAction[]
  keyQuestion: string | null
  messageTemplate: string | null
  order: number
}

export interface NicheBlueprint {
  key: string
  label: string
  description: string
  icon: string
  pipelineStages: PipelineStageBlueprint[]
  agentConfig: Omit<PromptConfig, 'companyName' | 'companyDescription'>
  lostReasons: string[]
  agentSteps: AgentStepBlueprint[]
  systemPrompt: string
  businessHoursEnabled: boolean
  businessHoursConfig: BusinessHoursConfig
  outOfHoursMessage: string
}

export interface WizardData {
  niche: string
  inboxId?: string
  whatsappConnected: boolean
  agentName: string
  companyName: string
  companyDescription: string
}
