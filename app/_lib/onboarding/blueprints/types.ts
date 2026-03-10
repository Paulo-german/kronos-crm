import type { PromptConfig } from '@/_actions/agent/shared/prompt-config-schema'
import type { BusinessHoursConfig } from '@/_actions/agent/update-agent/schema'

export interface PipelineStageBlueprint {
  name: string
  position: number
  color: string
}

export interface BlueprintStepAction {
  type: 'move_deal' | 'update_contact' | 'update_deal' | 'create_task' | 'create_appointment' | 'search_knowledge' | 'hand_off_to_human'
  trigger: string
  targetStagePosition?: number  // Só para move_deal — resolve para UUID no seed
  title?: string                // Para create_task / create_appointment
  dueDaysOffset?: number        // Para create_task
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
