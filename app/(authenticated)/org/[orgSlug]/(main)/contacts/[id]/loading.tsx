import { Skeleton } from '@/_components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/_components/ui/card'

const ContactDetailLoading = () => {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Back button */}
      <Skeleton className="h-8 w-20" />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-6 w-24" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Grid 2 cols */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/50 bg-secondary/20">
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-40" />
              </div>
            ))}
            <div className="flex items-center justify-between border-t pt-3">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-10" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-secondary/20">
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
      </div>

      {/* Deals card */}
      <Card className="border-border/50 bg-secondary/20">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-48" />
        </CardContent>
      </Card>

      {/* Responsável */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
    </div>
  )
}

export default ContactDetailLoading
