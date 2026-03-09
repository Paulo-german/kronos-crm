import type { PromptConfig } from '@/_actions/agent/shared/prompt-config-schema'
import type { BusinessHoursConfig } from '@/_actions/agent/update-agent/schema'

export interface PipelineStageBlueprint {
  name: string
  position: number
  color: string
}

export interface AgentStepBlueprint {
  name: string
  objective: string
  allowedActions: string[]
  activationRequirement: string
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
