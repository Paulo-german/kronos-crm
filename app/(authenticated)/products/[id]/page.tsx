import { createClient } from '@/_lib/supabase/server'
import { getProductById } from '@/_data-access/product/get-product-by-id'
import { notFound } from 'next/navigation'
import { Button } from '@/_components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { ArrowLeft, Package, DollarSign, FileText } from 'lucide-react'
import { formatCurrency } from '@/_helpers/format-currency'
import Link from 'next/link'

interface ProductDetailsPageProps {
  params: Promise<{ id: string }>
}

const ProductDetailsPage = async ({ params }: ProductDetailsPageProps) => {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const product = await getProductById(id, user.id)

  if (!product) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/products">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold">{product.name}</h1>
        <p className="text-muted-foreground">
          {product.description || 'Sem descrição'}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="h-5 w-5" />
              Produto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{product.name}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5" />
              Preço
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(product.price)}
            </p>
          </CardContent>
        </Card>
      </div>

      {product.description && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              Descrição
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{product.description}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default ProductDetailsPage
