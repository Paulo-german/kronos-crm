import { Skeleton } from '@/_components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/_components/ui/card'

function MemberRowSkeleton() {
  return (
    <tr className="border-b">
      <td className="p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-44" />
          </div>
        </div>
      </td>
      <td className="p-4">
        <Skeleton className="h-6 w-16 rounded-full" />
      </td>
      <td className="p-4">
        <Skeleton className="h-6 w-14 rounded-full" />
      </td>
      <td className="p-4 text-right">
        <Skeleton className="ml-auto h-4 w-20" />
      </td>
      <td className="w-[50px] p-4">
        <Skeleton className="h-8 w-8 rounded-md" />
      </td>
    </tr>
  )
}

export default function MembersLoading() {
  return (
    <div className="container mx-auto space-y-6 py-6">
      {/* Back button */}
      <div className="mb-6">
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-40 rounded-md" />
      </div>

      {/* Members table */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-36" />
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-4 text-left">
                  <Skeleton className="h-4 w-16" />
                </th>
                <th className="p-4 text-left">
                  <Skeleton className="h-4 w-16" />
                </th>
                <th className="p-4 text-left">
                  <Skeleton className="h-4 w-14" />
                </th>
                <th className="p-4 text-right">
                  <Skeleton className="ml-auto h-4 w-20" />
                </th>
                <th className="w-[50px] p-4" />
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 4 }).map((_, i) => (
                <MemberRowSkeleton key={i} />
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
