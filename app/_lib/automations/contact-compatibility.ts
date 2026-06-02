import { AutomationAction, AutomationTrigger } from '@prisma/client'

// Fonte única de verdade dos triggers/ações de contato, compartilhada entre
// schema (create), action (update) e UI (wizard).
//
// IMPORTANTE: este módulo NÃO pode ter `import 'server-only'`. Ele é importado
// transitivamente pelo schema do create-automation, que é consumido pelo
// wizard-form-types no bundle client do RHF. Adicionar `server-only` quebraria
// o build do client.

// Triggers cujo subjectKind é 'contact' (sem deal no contexto de execução)
export const CONTACT_TRIGGER_VALUES = [AutomationTrigger.CONTACT_CREATED] as const

// Ações compatíveis com triggers de contato (operam sem deal)
export const CONTACT_SUPPORTED_ACTION_VALUES = [
  AutomationAction.SEND_WHATSAPP_FOLLOWUP,
  AutomationAction.NOTIFY_USER,
  AutomationAction.UPDATE_CONTACT_LIFECYCLE,
] as const
