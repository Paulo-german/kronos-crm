import type { ComponentType } from 'react'
import { DealCardAnatomy } from './deal-card-anatomy'
import { DealCardLegend } from './deal-card-legend'
import { LifecycleStagesSlide } from './lifecycle-stages-slide'
import { LifecycleHealthSlide } from './lifecycle-health-slide'
import { LifecycleCaptureSlide } from './lifecycle-capture-slide'
import { LifecycleOverviewSlide } from './lifecycle-overview-slide'
import { LifecycleAutoAdvanceSlide } from './lifecycle-auto-advance-slide'
import { LifecycleFilterTabsSlide } from './lifecycle-filter-tabs-slide'
import { LifecycleTimelineSlide } from './lifecycle-timeline-slide'
import { LifecycleAgentSlide } from './lifecycle-agent-slide'
import { LifecycleAgentConfigSlide } from './lifecycle-agent-config-slide'
import { TaskOutcomeIntroSlide } from './task-outcome-intro-slide'
import { TaskOutcomeTypesSlide } from './task-outcome-types-slide'
import { TaskOutcomeFlowSlide } from './task-outcome-flow-slide'
import { TaskOutcomeTimelineSlide } from './task-outcome-timeline-slide'

interface TutorialComponentEntry {
  component: ComponentType
  sidebar?: ComponentType // Conteúdo extra renderizado na coluna esquerda, abaixo do título/descrição
}

// Mapa de componentes React disponíveis para slides do tipo 'component'
// Para adicionar um novo: crie o componente em ./slides/ e registre aqui
export const TUTORIAL_COMPONENT_MAP: Record<string, TutorialComponentEntry> = {
  'deal-card-anatomy': {
    component: DealCardAnatomy,
    sidebar: DealCardLegend,
  },
  'lifecycle-stages': { component: LifecycleStagesSlide },
  'lifecycle-health': { component: LifecycleHealthSlide },
  'lifecycle-capture': { component: LifecycleCaptureSlide },
  'lifecycle-overview': { component: LifecycleOverviewSlide },
  'lifecycle-auto-advance': { component: LifecycleAutoAdvanceSlide },
  'lifecycle-filter-tabs': { component: LifecycleFilterTabsSlide },
  'lifecycle-timeline': { component: LifecycleTimelineSlide },
  'lifecycle-agent': { component: LifecycleAgentSlide },
  'lifecycle-agent-config': { component: LifecycleAgentConfigSlide },
  'task-outcome-intro': { component: TaskOutcomeIntroSlide },
  'task-outcome-types': { component: TaskOutcomeTypesSlide },
  'task-outcome-flow': { component: TaskOutcomeFlowSlide },
  'task-outcome-timeline': { component: TaskOutcomeTimelineSlide },
}
