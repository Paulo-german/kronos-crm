import 'server-only'

export interface TemplateVars {
  deal: {
    title: string
    stage: string
    assignee: string
    status: string
    priority: string
    value: string
  }
  contact: {
    name: string
    firstName: string
  }
  user: {
    name: string
  }
}

// Regex que captura todos os placeholders suportados
const PLACEHOLDER_REGEX =
  /\{\{(deal\.(title|stage|assignee|status|priority|value)|contact\.(name|firstName)|user\.name)\}\}/g

/**
 * Substitui placeholders no template com dados reais do deal/contato/usuário.
 * Placeholders suportados:
 * - {{deal.title}}, {{deal.stage}}, {{deal.assignee}}, {{deal.status}}, {{deal.priority}}, {{deal.value}}
 * - {{contact.name}}, {{contact.firstName}}
 * - {{user.name}} (alias de {{deal.assignee}})
 */
export function resolveTemplate(template: string, vars: Partial<TemplateVars>): string {
  return template.replace(PLACEHOLDER_REGEX, (match) => {
    if (match === '{{deal.title}}') return vars.deal?.title ?? ''
    if (match === '{{deal.stage}}') return vars.deal?.stage ?? ''
    if (match === '{{deal.assignee}}') return vars.deal?.assignee ?? ''
    if (match === '{{deal.status}}') return vars.deal?.status ?? ''
    if (match === '{{deal.priority}}') return vars.deal?.priority ?? ''
    if (match === '{{deal.value}}') return vars.deal?.value ?? ''
    if (match === '{{contact.name}}') return vars.contact?.name ?? ''
    if (match === '{{contact.firstName}}') return vars.contact?.firstName ?? ''
    if (match === '{{user.name}}') return vars.user?.name ?? vars.deal?.assignee ?? ''
    return ''
  })
}
