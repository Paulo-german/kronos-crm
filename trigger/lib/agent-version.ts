// Re-exporta de app/_lib para manter a source-of-truth em único local,
// acessível tanto pelo lado app/ quanto pelos workers do Trigger.dev.
export { AGENT_VERSION_ALIAS, resolveCanonicalAgentVersion } from '../../app/_lib/agent/agent-version'
