import { Skeleton } from '@/_components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/_components/ui/card'

export default function ContactDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Navigation + Transfer */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-10 w-44 rounded-md" />
      </div>

      {/* Header: Name + Role */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-40" />
        </div>
      </div>

      {/* Grid: Info + Company */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Card Informações de Contato */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-52" />
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Responsável */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-32" />
            </div>
            {/* Email */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-44" />
            </div>
            {/* Telefone */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-32" />
            </div>
            {/* CPF */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-28" />
            </div>
            {/* Decisor */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-10 rounded-full" />
            </div>
          </CardContent>
        </Card>

        {/* Card Empresa */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-28" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-full rounded-md" />
          </CardContent>
        </Card>
      </div>

      {/* Card Negociações Vinculadas */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-52" />
        </CardContent>
      </Card>
    </div>
  )
}
