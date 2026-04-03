import type { ComponentType } from 'react'
import { DealCardAnatomy } from './deal-card-anatomy'
import { DealCardLegend } from './deal-card-legend'

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
}
