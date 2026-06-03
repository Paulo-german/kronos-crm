import { redirect } from 'next/navigation'

interface InboxSettingsRootPageProps {
  params: Promise<{ orgSlug: string }>
}

const InboxSettingsRootPage = async ({ params }: InboxSettingsRootPageProps) => {
  const { orgSlug } = await params
  redirect(`/org/${orgSlug}/inbox/settings/inboxes`)
}

export default InboxSettingsRootPage
