import { Skeleton } from '@/_components/ui/skeleton'

export default function LossReasonsLoading() {
  return (
    <div className="container mx-auto space-y-6 py-6">
      {/* Back button */}
      <div className="mb-6">
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-4 w-80" />
          </div>
          <Skeleton className="h-10 w-44 rounded-md" />
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <table className="w-full caption-bottom text-sm">
            <thead className="bg-secondary/20">
              <tr className="border-b">
                <th className="p-4">
                  <Skeleton className="h-4 w-16" />
                </th>
                <th className="p-4">
                  <Skeleton className="h-4 w-28" />
                </th>
                <th className="p-4">
                  <Skeleton className="h-4 w-16" />
                </th>
                <th className="p-4">
                  <Skeleton className="h-4 w-6" />
                </th>
              </tr>
            </thead>
            <tbody className="bg-card/80">
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b">
                  <td className="p-4">
                    <Skeleton className="h-5 w-36" />
                  </td>
                  <td className="p-4">
                    <Skeleton className="h-6 w-10 rounded-full" />
                  </td>
                  <td className="p-4">
                    <Skeleton className="h-5 w-10 rounded-full" />
                  </td>
                  <td className="p-4">
                    <Skeleton className="h-5 w-6" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
