import { redirect } from 'next/navigation'
import { createClient } from '@/_lib/supabase/server'
import { getDealDetails } from '@/_data-access/deal/get-deal-details'
import { getContacts } from '@/_data-access/contact/get-contacts'
import { getProducts } from '@/_data-access/product/get-products'
import DealDetailClient from './_components/deal-detail-client'

interface DealPageProps {
  params: Promise<{ id: string }>
}

export default async function DealPage({ params }: DealPageProps) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const deal = await getDealDetails(id, user.id)

  if (!deal) {
    redirect('/pipeline')
  }

  const [contacts, products] = await Promise.all([
    getContacts(user.id),
    getProducts(user.id),
  ])

  return (
    <DealDetailClient deal={deal} contacts={contacts} products={products} />
  )
}
