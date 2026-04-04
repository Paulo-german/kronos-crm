import { notFound, redirect } from 'next/navigation'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getInboxById } from '@/_data-access/inbox/get-inbox-by-id'
import { getWhatsAppTemplates } from '@/_data-access/inbox/get-whatsapp-templates'
import { TemplatesList } from './_components/templates-list'

interface TemplatesPageProps {
  params: Promise<{ orgSlug: string; inboxId: string }>
}

/**
 * Página de gerenciamento de WhatsApp Message Templates.
 * Acessível em /org/[orgSlug]/settings/inboxes/[inboxId]/templates
 * Somente para inboxes META_CLOUD com metaWabaId configurado.
 */
export default async function TemplatesPage({ params }: TemplatesPageProps) {
  const { orgSlug, inboxId } = await params
  const ctx = await getOrgContext(orgSlug)

  const inbox = await getInboxById(inboxId, ctx.orgId)

  if (!inbox) notFound()

  // Guard: somente inboxes Meta Cloud com WABA configurado podem ter templates
  if (inbox.connectionType !== 'META_CLOUD' || !inbox.metaWabaId) {
    redirect(`/org/${orgSlug}/settings/inboxes/${inboxId}`)
  }

  // Carregar templates inicialmente no servidor (cache 5min)
  // O cliente pode fazer refresh manual depois via action
  const initialTemplates = await getWhatsAppTemplates(inboxId, ctx.orgId)

  return (
    <TemplatesList
      inboxId={inboxId}
      inboxName={inbox.name}
      orgSlug={orgSlug}
      initialTemplates={initialTemplates}
    />
  )
}
