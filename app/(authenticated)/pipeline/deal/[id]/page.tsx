import { redirect } from 'next/navigation'
import { createClient } from '@/_lib/supabase/server'
import { getDealDetails } from '@/_data-access/deal/get-deal-details'
import { getProducts } from '@/_data-access/product/get-products'
import DealDetailClient from './_components/deal-detail-client'

interface DealPageProps {
  params: Promise<{ id: string }>
}

const DealPage = async ({ params }: DealPageProps) => {
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

  const products = await getProducts(user.id)

  return (
    <div className="h-full w-full">
      <DealDetailClient deal={deal} products={products} />
    </div>
  )
}

export default DealPage
