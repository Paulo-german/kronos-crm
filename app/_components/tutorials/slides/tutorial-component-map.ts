import type { ComponentType } from 'react'
import { PipelineListViewSlide } from './pipeline-list-view-slide'
import { PipelineMultiFunnelSlide } from './pipeline-multi-funnel-slide'
import { PipelineOverviewSlide } from './pipeline-overview-slide'
import { PipelineCreateDealSlide } from './pipeline-create-deal-slide'
import { PipelineDragDropSlide } from './pipeline-drag-drop-slide'
import { PipelineDealDetailSlide } from './pipeline-deal-detail-slide'
import { PipelineFiltersSlide } from './pipeline-filters-slide'
import { PipelineCloseDealSlide } from './pipeline-close-deal-slide'
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
import { DealDetailSummarySlide } from './deal-detail-summary-slide'
import { DealDetailSummaryLegend } from './deal-detail-summary-legend'
import { DealDetailProductsSlide } from './deal-detail-products-slide'
import { DealDetailTasksSlide } from './deal-detail-tasks-slide'
import { DealDetailAppointmentsSlide } from './deal-detail-appointments-slide'

interface TutorialComponentEntry {
  component: ComponentType
  sidebar?: ComponentType // Conteúdo extra renderizado na coluna esquerda, abaixo do título/descrição
}

// Mapa de componentes React disponíveis para slides do tipo 'component'
// Para adicionar um novo: crie o componente em ./slides/ e registre aqui
export const TUTORIAL_COMPONENT_MAP: Record<string, TutorialComponentEntry> = {
  'pipeline-list-view': { component: PipelineListViewSlide },
  'pipeline-multi-funnel': { component: PipelineMultiFunnelSlide },
  'pipeline-overview': { component: PipelineOverviewSlide },
  'pipeline-create-deal': { component: PipelineCreateDealSlide },
  'pipeline-drag-drop': { component: PipelineDragDropSlide },
  'pipeline-deal-detail': { component: PipelineDealDetailSlide },
  'pipeline-filters': { component: PipelineFiltersSlide },
  'pipeline-close-deal': { component: PipelineCloseDealSlide },
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
  'deal-detail-summary': { component: DealDetailSummarySlide, sidebar: DealDetailSummaryLegend },
  'deal-detail-products': { component: DealDetailProductsSlide },
  'deal-detail-tasks': { component: DealDetailTasksSlide },
  'deal-detail-appointments': { component: DealDetailAppointmentsSlide },
}
