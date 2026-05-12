export interface AgentCapabilities {
  canUseProductTools: boolean
  canUseServiceTools: boolean
}

interface CapabilityFlags {
  agentMode: 'PRODUCT' | 'SERVICE' | 'HYBRID'
  hasActiveProducts: boolean
  hasActiveServicesWithProfessionals: boolean
}

export function computeAgentCapabilities(flags: CapabilityFlags): AgentCapabilities {
  const modeAllowsProducts = flags.agentMode === 'PRODUCT' || flags.agentMode === 'HYBRID'
  const modeAllowsServices = flags.agentMode === 'SERVICE' || flags.agentMode === 'HYBRID'

  return {
    canUseProductTools: modeAllowsProducts && flags.hasActiveProducts,
    canUseServiceTools: modeAllowsServices && flags.hasActiveServicesWithProfessionals,
  }
}
