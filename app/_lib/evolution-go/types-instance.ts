export interface EvolutionGoInstanceInfo {
  ownerJid: string | null
  profileName: string | null
  profilePictureUrl: string | null
}

export interface EvolutionGoConnectionState {
  state: 'open' | 'close' | 'connecting'
}

export interface EvolutionGoQRCodeResult {
  base64: string | null
  code: string | null
  pairingCode: string | null
  state: 'open' | 'close' | 'connecting'
}

export interface EvolutionGoCreateInstanceResult {
  instanceName: string
  instanceId: string
  qrBase64: string | null
}
